import { fireEvent, render as renderWithoutToaster, screen, within } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";

import { EXAMPLE_COMPETITOR_IMPORT } from "@/lib/competitor-import/example-competitor-import";

import { ImportedCompetitor } from "@/types/competitor-import";

import { EMPTY_TOURNAMENT_DRAFT, newEventDraft, newFencerDraft } from "../tournament-draft-helpers";
import { NewTournamentForm } from "./new-tournament-form";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

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
  genderMix: "Women",
  ageCategory: "Y14",
  ratingLevel: "Open",
  qualifier: "No",
};

const DRAFT_KEY = "tournament-creation-draft:2";

const SAVED_TOURNAMENT = {
  ...EMPTY_TOURNAMENT_DRAFT,
  name: "Northeastern Open",
  location: "Boston, MA",
  venue: "Cabot Center",
  date: "2026-11-20",
  time: "08:00",
  authority: "USA Fencing",
  saved: true,
};

function saveDraft(events: ReturnType<typeof newEventDraft>[], tournament = SAVED_TOURNAMENT) {
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
    expect(toggle).toHaveTextContent("Y14 Foil1 fencer");
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
    expect(within(card).getByRole("combobox", { name: "Weapon" })).toHaveAttribute("aria-invalid", "true");
    expect(within(card).getByRole("textbox", { name: "Event name" })).not.toHaveAttribute("aria-invalid", "true");
  });

  it("collapses a saved event to a summary, and reopens it with Edit", () => {
    saveDraft([{ ...newEventDraft(), ...FILLED_EVENT }]);
    render(<NewTournamentForm />);
    const card = screen.getByRole("group", { name: "Y14 Foil" });

    fireEvent.click(within(card).getByRole("button", { name: "Save event" }));

    expect(within(card).queryByRole("textbox")).not.toBeInTheDocument();
    expect(card).toHaveTextContent("Foil · Women · Y14 · Open");
    expect(card).toHaveTextContent("Nov 20, 2026 at 09:00");

    fireEvent.click(within(card).getByRole("button", { name: "Edit" }));

    expect(within(card).getByRole("textbox", { name: "Event name" })).toHaveValue("Y14 Foil");
  });

  it("only saves events once the tournament is saved", () => {
    saveDraft([{ ...newEventDraft(), ...FILLED_EVENT }], { ...SAVED_TOURNAMENT, venue: "", saved: false });
    render(<NewTournamentForm />);
    const tournament = screen.getByRole("group", { name: "Tournament details" });
    const saveEvent = within(screen.getByRole("group", { name: "Y14 Foil" })).getByRole("button", { name: "Save event" });
    expect(saveEvent).toBeDisabled();

    fireEvent.click(within(tournament).getByRole("button", { name: "Save tournament" }));
    expect(within(tournament).getByRole("textbox", { name: "Venue" })).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(within(tournament).getByRole("textbox", { name: "Venue" }), { target: { value: "Cabot Center" } });
    fireEvent.click(within(tournament).getByRole("button", { name: "Save tournament" }));

    expect(tournament).toHaveTextContent("Cabot Center · Boston, MA");
    expect(saveEvent).toBeEnabled();
  });

  it("won't save an event while a fencer is missing details", () => {
    saveDraft([{ ...newEventDraft(), ...FILLED_EVENT, fencers: [newFencerDraft(MARIA)] }]);
    render(<NewTournamentForm />);
    const card = screen.getByRole("group", { name: "Y14 Foil" });

    fireEvent.click(within(card).getByRole("button", { name: "Save event" }));

    expect(within(card).getByRole("alert")).toHaveTextContent("Finish the fencers marked as missing details");
    fireEvent.click(within(card).getByRole("button", { name: "1 fencer" }));
    expect(within(card).getByRole("group", { name: "Alvarez, Maria" })).toHaveTextContent("Missing birth date, division");
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
});
