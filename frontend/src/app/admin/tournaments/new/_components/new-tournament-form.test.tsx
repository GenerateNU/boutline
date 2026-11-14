import { act, fireEvent, render as renderWithoutToaster, screen, waitFor, within } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";

import { EXAMPLE_COMPETITOR_IMPORT } from "@/lib/competitor-import/example-competitor-import";

import { ImportedCompetitor } from "@/types/competitor-import";

import { TournamentDraft } from "../_types/tournament-draft";
import { EMPTY_TOURNAMENT_DRAFT, newEventDraft, newFencerDraft } from "../tournament-draft-helpers";
import { NewTournamentForm } from "./new-tournament-form";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

const MARIA: ImportedCompetitor = {
  firstName: "Maria",
  lastName: "Alvarez",
  memberNumber: "100234501",
  club: "Boston Fencing Club",
  division: "",
  country: "USA",
  birthdate: "",
  gender: "F",
  rating: "C",
  ratingYear: 2024,
  event: "Y14 Foil",
};

const FILLED_EVENT = {
  name: "Y14 Foil",
  date: "2026-11-20",
  time: "09:00",
  weapon: "Foil",
  genderMix: "Female",
  ageCategory: "Y14",
  ratingLevel: "Open",
  qualifier: "No",
};

const DRAFT_KEY = "account:tournament-creation-draft";

const SAVED_TOURNAMENT: TournamentDraft = {
  ...EMPTY_TOURNAMENT_DRAFT,
  name: "Northeastern Open",
  location: "Boston, MA",
  venue: "Cabot Center",
  date: "2026-11-20",
  time: "08:00",
  authority: "USA Fencing",
  tournamentId: "t1",
  saved: true,
};

interface ApiCall {
  method: string;
  path: string;
  body: Record<string, unknown> | undefined;
}

interface ApiReply {
  status: number;
  body?: unknown;
}

let apiCalls: ApiCall[] = [];
let created = 0;

// Stands in for the backend: creates answer with a fresh id, deletes with 204.
// A test passes `respond` to fail or hold particular requests.
function mockApi(respond: (call: ApiCall) => ApiReply | Promise<ApiReply> | undefined = () => undefined) {
  global.fetch = jest.fn(async (url: string, init: RequestInit) => {
    const call: ApiCall = {
      method: init.method ?? "GET",
      path: url,
      body: init.body ? JSON.parse(init.body as string) : undefined,
    };
    apiCalls.push(call);
    const reply = (await respond(call)) ?? {
      status: call.method === "DELETE" ? 204 : 200,
      body: { id: `id-${++created}` },
    };
    return { status: reply.status, ok: reply.status < 400, json: async () => reply.body ?? null };
  }) as unknown as typeof fetch;
}

function requests() {
  return apiCalls.map((call) => `${call.method} ${call.path}`);
}

function saveDraft(events: ReturnType<typeof newEventDraft>[], tournament: TournamentDraft = SAVED_TOURNAMENT) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...tournament, events }));
}

// The form toasts import results, so it needs the app's Toaster around it.
function render(ui: React.ReactElement) {
  return renderWithoutToaster(<Toaster>{ui}</Toaster>);
}

// jsdom's File lacks text(), which the parser reads it with.
function csvFile(content: string) {
  return Object.assign(new File([content], "registrations.csv", { type: "text/csv" }), {
    text: async () => content,
  });
}

describe("NewTournamentForm", () => {
  beforeEach(() => {
    apiCalls = [];
    created = 0;
    mockPush.mockClear();
    mockApi();
  });
  afterEach(() => sessionStorage.clear());

  it("restores the saved draft, events and fencers included", () => {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        ...EMPTY_TOURNAMENT_DRAFT,
        name: "Northeastern Open",
        authority: "FIE",
        events: [newEventDraft("Y14 Foil", [newFencerDraft(MARIA)]), newEventDraft("Div II Epee")],
      }),
    );
    render(<NewTournamentForm />);

    expect(screen.getByRole("textbox", { name: "Name of tournament" })).toHaveValue("Northeastern Open");
    expect(screen.getByRole("combobox", { name: "Authority" })).toHaveTextContent("FIE");
    const first = screen.getByRole("group", { name: "Y14 Foil" });
    expect(within(first).getByRole("textbox", { name: "Event name" })).toHaveValue("Y14 Foil");
    fireEvent.click(within(first).getByRole("button", { name: "1 fencer" }));
    expect(within(first).getByRole("group", { name: "Alvarez, Maria" })).toHaveTextContent("Boston Fencing Club · C24");
    expect(screen.getByRole("group", { name: "Div II Epee" })).toHaveTextContent("No fencers yet");
  });

  it("ignores a draft left by the old two-step form, which had no events", () => {
    sessionStorage.setItem("tournament-draft", JSON.stringify({ name: "Old Open", authority: "FIE" }));
    render(<NewTournamentForm />);

    expect(screen.getByRole("group", { name: "Event 1" })).toBeInTheDocument();
  });

  it("says why a dropped file was turned away", async () => {
    const { container } = render(<NewTournamentForm />);

    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [new File(["hi"], "notes.txt", { type: "text/plain" })] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't import that file");
  });

  it("drops a CSV still parsing when a newer file is rejected", async () => {
    let finishParsing: ((text: string) => void) | undefined;
    const slowCsv = Object.assign(new File([""], "registrations.csv", { type: "text/csv" }), {
      text: () => new Promise<string>((resolve) => (finishParsing = resolve)),
    });
    const { container } = render(<NewTournamentForm />);
    const input = container.querySelector('input[type="file"]')!;

    fireEvent.change(input, { target: { files: [slowCsv] } });
    // Only drop the second file once the first is mid-parse, or there's no race.
    await waitFor(() => expect(finishParsing).toBeDefined());
    fireEvent.change(input, { target: { files: [new File(["hi"], "notes.txt", { type: "text/plain" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't import that file");
    await act(async () => finishParsing!(EXAMPLE_COMPETITOR_IMPORT));

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't import that file");
    expect(screen.queryByText(/Autofilled/)).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Y14 Women's Foil" })).not.toBeInTheDocument();
  });

  it("won't submit while a tournament field is only spaces", () => {
    saveDraft([{ ...newEventDraft(), ...FILLED_EVENT, saved: true }], { ...SAVED_TOURNAMENT, venue: "   " });
    render(<NewTournamentForm />);

    fireEvent.submit(screen.getByRole("button", { name: "Create tournament" }).closest("form")!);

    expect(screen.getByRole("alert")).toHaveTextContent("Finish the tournament details");
    expect(screen.getByRole("textbox", { name: "Venue" })).toHaveValue("   ");
  });

  it("adds and removes event cards, keeping at least one", () => {
    render(<NewTournamentForm />);
    expect(screen.queryByRole("button", { name: "Remove Event 1" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add event" }));
    expect(screen.getByRole("group", { name: "Event 2" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove Event 2" }));
    expect(screen.queryByRole("group", { name: "Event 2" })).not.toBeInTheDocument();
  });

  it("sorts an uploaded CSV's fencers into a card per event", async () => {
    const { container } = render(<NewTournamentForm />);

    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [csvFile(EXAMPLE_COMPETITOR_IMPORT)] },
    });

    expect(await screen.findByText("Autofilled 2 events and 5 fencers from registrations.csv.")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Y14 Women's Foil" })).toHaveTextContent("4 fencers");
    expect(screen.getByRole("group", { name: "Div II Men's Epee" })).toHaveTextContent("1 fencer");
    expect(screen.queryByRole("group", { name: "Event 1" })).not.toBeInTheDocument();
  });

  it("collapses a card to its name and fencer count, and expands it again", () => {
    saveDraft([newEventDraft("Y14 Foil", [newFencerDraft(MARIA)])]);
    render(<NewTournamentForm />);
    const card = screen.getByRole("group", { name: "Y14 Foil" });
    const toggle = within(card).getByRole("button", { expanded: true });

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAccessibleName("Y14 Foil");
    expect(card).toHaveTextContent("1 fencer");
    expect(within(card).queryByRole("textbox")).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(within(card).getByRole("textbox", { name: "Event name" })).toHaveValue("Y14 Foil");
  });

  it("reopens a collapsed, unfinished card instead of submitting", () => {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        ...EMPTY_TOURNAMENT_DRAFT,
        name: "Open",
        location: "Boston, MA",
        venue: "Gym",
        date: "2026-11-20",
        time: "09:00",
        authority: "FIE",
        events: [{ ...newEventDraft(), ...FILLED_EVENT, saved: true }, newEventDraft("Div II Epee")],
      }),
    );
    render(<NewTournamentForm />);
    const second = screen.getByRole("group", { name: "Div II Epee" });
    fireEvent.click(within(second).getByRole("button", { expanded: true }));

    fireEvent.submit(screen.getByRole("button", { name: "Create tournament" }).closest("form")!);

    expect(screen.getByRole("alert")).toHaveTextContent("Finish Div II Epee before creating the tournament.");
    expect(within(second).getByRole("textbox", { name: "Event name" })).toHaveValue("Div II Epee");
  });

  it("won't save an event with empty fields, and marks them", () => {
    saveDraft([{ ...newEventDraft(), ...FILLED_EVENT, weapon: "" }]);
    render(<NewTournamentForm />);
    const card = screen.getByRole("group", { name: "Y14 Foil" });

    fireEvent.click(within(card).getByRole("button", { name: "Save event" }));

    expect(within(card).getByRole("alert")).toHaveTextContent("Fill in the highlighted fields");
    const weapon = within(card).getByRole("combobox", { name: "Weapon" });
    expect(weapon).toHaveAttribute("aria-invalid", "true");
    expect(weapon).toHaveAccessibleDescription("Fill in the highlighted fields to save this event.");
    expect(within(card).getByRole("textbox", { name: "Event name" })).not.toHaveAttribute("aria-invalid", "true");
  });

  it("collapses a saved event to a summary, and reopens it with Edit", async () => {
    saveDraft([{ ...newEventDraft(), ...FILLED_EVENT }]);
    render(<NewTournamentForm />);
    const card = screen.getByRole("group", { name: "Y14 Foil" });

    fireEvent.click(within(card).getByRole("button", { name: "Save event" }));

    await waitFor(() => expect(within(card).queryByRole("textbox")).not.toBeInTheDocument());
    expect(card).toHaveTextContent("Foil · Female · Y14 · Open");
    expect(card).toHaveTextContent("Nov 20, 2026 at 09:00");

    fireEvent.click(within(card).getByRole("button", { name: "Edit" }));

    expect(within(card).getByRole("textbox", { name: "Event name" })).toHaveValue("Y14 Foil");
  });

  it("only saves events once the tournament is saved", async () => {
    saveDraft([{ ...newEventDraft(), ...FILLED_EVENT }], {
      ...SAVED_TOURNAMENT,
      venue: "",
      tournamentId: undefined,
      saved: false,
    });
    render(<NewTournamentForm />);
    const tournament = screen.getByRole("group", { name: "Tournament details" });
    const saveEvent = within(screen.getByRole("group", { name: "Y14 Foil" })).getByRole("button", { name: "Save event" });
    expect(saveEvent).toBeDisabled();

    fireEvent.click(within(tournament).getByRole("button", { name: "Save tournament" }));
    expect(within(tournament).getByRole("textbox", { name: "Venue" })).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(within(tournament).getByRole("textbox", { name: "Venue" }), { target: { value: "Cabot Center" } });
    fireEvent.click(within(tournament).getByRole("button", { name: "Save tournament" }));

    await waitFor(() => expect(tournament).toHaveTextContent("Cabot Center · Boston, MA"));
    expect(saveEvent).toBeEnabled();
  });

  it("won't save an event while a fencer is missing details", () => {
    saveDraft([{ ...newEventDraft(), ...FILLED_EVENT, fencers: [newFencerDraft(MARIA)] }]);
    render(<NewTournamentForm />);
    const card = screen.getByRole("group", { name: "Y14 Foil" });

    fireEvent.click(within(card).getByRole("button", { name: "Save event" }));

    expect(within(card).getByRole("alert")).toHaveTextContent("Finish the fencers marked as missing details");
    // The list and the fencer open by themselves, with the empty fields marked.
    const maria = within(card).getByRole("group", { name: "Alvarez, Maria" });
    const division = within(maria).getByRole("textbox", { name: "Division" });
    expect(division).toHaveAttribute("aria-invalid", "true");
    expect(division).toHaveAccessibleDescription("Missing birth date, division");
    expect(within(maria).getByRole("textbox", { name: "First name" })).not.toHaveAttribute("aria-invalid");
  });

  it("edits, removes and adds fencers by hand", () => {
    saveDraft([newEventDraft("Y14 Foil", [newFencerDraft(MARIA)])]);
    render(<NewTournamentForm />);
    const card = screen.getByRole("group", { name: "Y14 Foil" });
    fireEvent.click(within(card).getByRole("button", { name: "1 fencer" }));

    fireEvent.click(within(card).getByRole("button", { name: "Edit Alvarez, Maria" }));
    fireEvent.change(within(card).getByRole("textbox", { name: "First name" }), { target: { value: "Mia" } });
    expect(within(card).getByRole("group", { name: "Alvarez, Mia" })).toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Remove Alvarez, Mia" }));
    expect(card).toHaveTextContent("No fencers yet");

    fireEvent.click(within(card).getByRole("button", { name: "Add fencer" }));
    const added = within(card).getByRole("group", { name: "New fencer" });
    expect(added).toHaveTextContent("Missing first name, last name, gender, birth date, division");
    expect(within(added).getByRole("textbox", { name: "First name" })).toHaveValue("");
  });

  it("creates the tournament on the first save and updates it on the next", async () => {
    saveDraft([newEventDraft()], { ...SAVED_TOURNAMENT, tournamentId: undefined, saved: false });
    render(<NewTournamentForm />);
    const tournament = screen.getByRole("group", { name: "Tournament details" });

    fireEvent.click(within(tournament).getByRole("button", { name: "Save tournament" }));
    fireEvent.click(await within(tournament).findByRole("button", { name: "Edit" }));
    fireEvent.click(within(tournament).getByRole("button", { name: "Save tournament" }));
    await within(tournament).findByRole("button", { name: "Edit" });

    expect(requests()).toEqual(["POST /api/v1/tournaments", "PATCH /api/v1/tournaments/id-1"]);
    expect(apiCalls[0].body).toMatchObject({
      name: "Northeastern Open",
      city: "Boston, MA",
      venue: "Cabot Center",
      sanctioning_authority: "usa_fencing",
    });
  });

  it("shows Saving… and ignores a second click while a save is in flight", async () => {
    let finish: (() => void) | undefined;
    mockApi(
      (call) =>
        call.method === "POST"
          ? new Promise((resolve) => (finish = () => resolve({ status: 200, body: { id: "t9" } })))
          : undefined,
    );
    saveDraft([newEventDraft()], { ...SAVED_TOURNAMENT, tournamentId: undefined, saved: false });
    render(<NewTournamentForm />);
    const tournament = screen.getByRole("group", { name: "Tournament details" });

    fireEvent.click(within(tournament).getByRole("button", { name: "Save tournament" }));
    const saving = await within(tournament).findByRole("button", { name: "Saving…" });
    fireEvent.click(saving);

    expect(saving).toBeDisabled();
    expect(within(tournament).getByRole("textbox", { name: "Venue" })).toBeDisabled();
    expect(within(tournament).getByRole("combobox", { name: "Authority" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Create tournament" })).toBeDisabled();
    await act(async () => finish!());
    await within(tournament).findByRole("button", { name: "Edit" });
    expect(requests()).toEqual(["POST /api/v1/tournaments"]);
  });

  it("shows a failed fencer's error and retries only what failed", async () => {
    const lee = { ...MARIA, firstName: "Jin", lastName: "Lee", memberNumber: "100234502" };
    const fencers = [MARIA, lee].map((fencer) => newFencerDraft({ ...fencer, division: "Div I", birthdate: "2012-03-04" }));
    saveDraft([{ ...newEventDraft(), ...FILLED_EVENT, fencers }]);
    let leeFails = true;
    mockApi((call) =>
      leeFails && call.body?.lastName === "Lee"
        ? { status: 409, body: { detail: "Duplicate member number" } }
        : undefined,
    );
    render(<NewTournamentForm />);
    const card = screen.getByRole("group", { name: "Y14 Foil" });

    fireEvent.click(within(card).getByRole("button", { name: "Save event" }));

    expect(await within(card).findByRole("alert")).toHaveTextContent("Jin Lee: Duplicate member number");
    expect(requests()).toEqual(["POST /api/v1/events", "POST /api/v1/competitors", "POST /api/v1/competitors"]);

    leeFails = false;
    apiCalls = [];
    fireEvent.click(within(card).getByRole("button", { name: "Save event" }));

    await waitFor(() => expect(within(card).queryByRole("textbox")).not.toBeInTheDocument());
    expect(requests()).toEqual(["PATCH /api/v1/events/id-1", "POST /api/v1/competitors"]);
    expect(apiCalls[1].body).toMatchObject({ lastName: "Lee", eventId: "id-1" });
  });

  it.each([
    { outcome: "removes", status: 204, gone: true },
    { outcome: "keeps, with an error,", status: 500, gone: false },
  ])("$outcome a saved card when the server answers $status", async ({ status, gone }) => {
    mockApi(() => ({ status, body: { detail: "Server exploded" } }));
    saveDraft([
      { ...newEventDraft("Y14 Foil"), ...FILLED_EVENT, eventId: "e1", saved: true },
      newEventDraft("Div II Epee"),
    ]);
    render(<NewTournamentForm />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Y14 Foil" }));

    await waitFor(() => expect(requests()).toEqual(["DELETE /api/v1/events/e1"]));
    if (gone) {
      await waitFor(() => expect(screen.queryByRole("group", { name: "Y14 Foil" })).not.toBeInTheDocument());
    } else {
      expect(await within(screen.getByRole("group", { name: "Y14 Foil" })).findByRole("alert")).toHaveTextContent(
        "Server exploded",
      );
    }
  });

  it("saves what's unsaved on submit, goes to the tournament and clears the draft", async () => {
    saveDraft([{ ...newEventDraft(), ...FILLED_EVENT }], { ...SAVED_TOURNAMENT, tournamentId: undefined, saved: false });
    render(<NewTournamentForm />);

    fireEvent.click(screen.getByRole("button", { name: "Create tournament" }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/tournaments/id-1"));
    expect(requests()).toEqual(["POST /api/v1/tournaments", "POST /api/v1/events"]);
    expect(apiCalls[1].body).toMatchObject({ tournament_id: "id-1", weapon: "foil", gender: "female" });
    const stored = JSON.parse(sessionStorage.getItem(DRAFT_KEY)!);
    expect(stored).toMatchObject({ name: "", saved: false });
    expect(stored.tournamentId).toBeUndefined();
  });

  it("stays on the form and names the card that failed to save on submit", async () => {
    mockApi((call) => (call.path.endsWith("/events") ? { status: 500, body: { detail: "Server exploded" } } : undefined));
    saveDraft([{ ...newEventDraft(), ...FILLED_EVENT }]);
    render(<NewTournamentForm />);

    fireEvent.click(screen.getByRole("button", { name: "Create tournament" }));

    await waitFor(() => expect(screen.getAllByRole("alert").map((alert) => alert.textContent)).toContain(
      "Couldn't save Y14 Foil. Fix the errors on the cards and try again.",
    ));
    expect(mockPush).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem(DRAFT_KEY)!).tournamentId).toBe("t1");
  });
});
