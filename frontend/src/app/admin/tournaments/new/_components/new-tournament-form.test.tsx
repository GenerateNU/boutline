import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { EventDraft, TournamentDraft } from "../_types/tournament-draft";
import { EMPTY_TOURNAMENT_DRAFT, newEventDraft } from "../tournament-draft-helpers";
import { NewTournamentForm } from "./new-tournament-form";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

const DRAFT_KEY = "account:tournament-creation-draft";

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

const FILLED_TOURNAMENT: TournamentDraft = {
  ...EMPTY_TOURNAMENT_DRAFT,
  name: "Northeastern Open",
  location: "Boston, MA",
  venue: "Cabot Center",
  date: "2026-11-20",
  time: "08:00",
  authority: "USA Fencing",
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

function filledEvent(patch: Partial<EventDraft> = {}): EventDraft {
  return { ...newEventDraft(), ...FILLED_EVENT, ...patch };
}

function saveDraft(events: EventDraft[], tournament: TournamentDraft = FILLED_TOURNAMENT) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...tournament, events }));
}

function storedDraft(): TournamentDraft {
  return JSON.parse(sessionStorage.getItem(DRAFT_KEY)!);
}

function continueButton() {
  return screen.getByRole("button", { name: "Continue" });
}

describe("NewTournamentForm", () => {
  beforeEach(() => {
    apiCalls = [];
    created = 0;
    mockPush.mockClear();
    mockApi();
  });
  afterEach(() => sessionStorage.clear());

  it("restores the draft's tournament fields and lists its events", () => {
    saveDraft([filledEvent(), filledEvent({ name: "Cadet Epee" })]);
    render(<NewTournamentForm />);

    expect(screen.getByRole("textbox", { name: "Name of Tournament" })).toHaveValue("Northeastern Open");
    expect(within(screen.getByRole("list", { name: "Events" })).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Y14 Foil",
      "Cadet Epee",
    ]);
  });

  it("adds an event to the draft and opens it on its own page", () => {
    render(<NewTournamentForm />);

    fireEvent.click(screen.getByRole("button", { name: "Add Events" }));

    const [added] = storedDraft().events;
    expect(mockPush).toHaveBeenCalledWith(`/admin/tournaments/new/event?id=${added.id}`);
  });

  it("shows an edit link for each event only in edit mode", () => {
    const event = filledEvent();
    saveDraft([event]);
    render(<NewTournamentForm />);
    expect(screen.queryByRole("link", { name: "Edit Y14 Foil" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit Events" }));

    expect(screen.getByRole("link", { name: "Edit Y14 Foil" })).toHaveAttribute(
      "href",
      `/admin/tournaments/new/event?id=${event.id}`,
    );
    expect(screen.queryByRole("button", { name: "Add Events" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Exit Edit Mode" }));
    expect(screen.queryByRole("link", { name: "Edit Y14 Foil" })).not.toBeInTheDocument();
  });

  it.each([
    {
      case: "a tournament field is only spaces",
      tournament: { ...FILLED_TOURNAMENT, venue: "   " },
      events: [filledEvent()],
      alert: "Fill in the highlighted fields to create the tournament.",
    },
    {
      case: "there are no events",
      tournament: FILLED_TOURNAMENT,
      events: [],
      alert: "Add at least one event before creating the tournament.",
    },
    {
      case: "an event is unfinished",
      tournament: FILLED_TOURNAMENT,
      events: [filledEvent({ name: "", weapon: "" })],
      alert: "Finish Event 1 before creating the tournament.",
    },
  ])("won't create the tournament when $case", ({ tournament, events, alert }) => {
    saveDraft(events, tournament);
    render(<NewTournamentForm />);

    fireEvent.submit(continueButton().closest("form")!);

    expect(screen.getByRole("alert")).toHaveTextContent(alert);
    expect(apiCalls).toHaveLength(0);
  });

  it("creates the tournament and its events on Continue, then opens it and clears the draft", async () => {
    saveDraft([filledEvent()]);
    render(<NewTournamentForm />);

    fireEvent.click(continueButton());

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/admin/tournaments/id-1"));
    expect(requests()).toEqual(["POST /api/v1/tournaments", "POST /api/v1/events"]);
    expect(apiCalls[1].body).toMatchObject({ tournament_id: "id-1", weapon: "foil", gender: "female" });
    expect(storedDraft()).toMatchObject({ name: "", events: [] });
  });

  it("stays on the form when an event fails, names it, and retries only what failed", async () => {
    let failEvents = true;
    mockApi((call) =>
      failEvents && call.path.endsWith("/events") ? { status: 500, body: { detail: "Server exploded" } } : undefined,
    );
    saveDraft([filledEvent()]);
    render(<NewTournamentForm />);

    fireEvent.click(continueButton());

    expect(await screen.findByText("Couldn't save Y14 Foil. Fix the errors under each event and try again.")).toBeInTheDocument();
    expect(screen.getByText(/Server exploded/)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    expect(storedDraft().tournamentId).toBe("id-1");

    failEvents = false;
    apiCalls = [];
    fireEvent.click(continueButton());

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/admin/tournaments/id-1"));
    expect(requests()).toEqual(["POST /api/v1/events"]);
  });

  it("sends a tournament saved by an earlier Continue again once it's edited", async () => {
    saveDraft([filledEvent({ eventId: "e1", saved: true })], { ...FILLED_TOURNAMENT, tournamentId: "t1", saved: true });
    render(<NewTournamentForm />);

    fireEvent.change(screen.getByRole("textbox", { name: "Venue" }), { target: { value: "Matthews Arena" } });
    fireEvent.click(continueButton());

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/admin/tournaments/t1"));
    expect(requests()).toEqual(["PATCH /api/v1/tournaments/t1"]);
  });

  it("disables the form while it saves", async () => {
    let release = () => {};
    mockApi(() => new Promise<ApiReply>((resolve) => (release = () => resolve({ status: 200, body: { id: "t1" } }))));
    saveDraft([filledEvent()]);
    render(<NewTournamentForm />);

    fireEvent.click(continueButton());

    await waitFor(() => expect(continueButton()).toBeDisabled());
    expect(screen.getByRole("button", { name: "Clear All" })).toBeDisabled();
    release();
  });

  it("clears the whole draft with Clear All", () => {
    saveDraft([filledEvent()]);
    render(<NewTournamentForm />);

    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));

    expect(screen.getByRole("textbox", { name: "Name of Tournament" })).toHaveValue("");
    expect(within(screen.getByRole("list", { name: "Events" })).queryAllByRole("listitem")).toHaveLength(0);
    expect(storedDraft()).toMatchObject({ name: "", events: [] });
  });
});
