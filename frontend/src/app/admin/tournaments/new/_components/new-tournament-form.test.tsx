import { fireEvent, render, screen, within } from "@testing-library/react";

import { EXAMPLE_COMPETITOR_IMPORT } from "@/lib/competitor-import/example-competitor-import";

import { ImportedCompetitor } from "@/types/competitor-import";

import { EMPTY_TOURNAMENT_DRAFT, newEventDraft } from "../tournament-draft-helpers";
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

function saveDraft(events: ReturnType<typeof newEventDraft>[]) {
  sessionStorage.setItem("tournament-draft", JSON.stringify({ ...EMPTY_TOURNAMENT_DRAFT, events }));
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
      "tournament-draft",
      JSON.stringify({
        ...EMPTY_TOURNAMENT_DRAFT,
        name: "Northeastern Open",
        authority: "FIE",
        events: [newEventDraft("Y14 Foil", [MARIA]), newEventDraft("Div II Epee")],
      }),
    );
    render(<NewTournamentForm />);

    expect(screen.getByRole("textbox", { name: "Name of tournament" })).toHaveValue("Northeastern Open");
    expect(screen.getByRole("combobox", { name: "Authority" })).toHaveTextContent("FIE");
    const first = screen.getByRole("group", { name: "Event 1" });
    expect(within(first).getByRole("textbox", { name: "Event name" })).toHaveValue("Y14 Foil");
    expect(within(first).getByText("Alvarez, Maria")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Event 2" })).toHaveTextContent("No fencers yet");
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

    expect(await screen.findByRole("status")).toHaveTextContent("Added 5 fencers.");
    const womensFoil = screen.getByRole("group", { name: "Event 1" });
    expect(within(womensFoil).getByRole("textbox", { name: "Event name" })).toHaveValue("Y14 Women's Foil");
    expect(womensFoil).toHaveTextContent("4 fencers");
    expect(screen.getByRole("group", { name: "Event 2" })).toHaveTextContent("1 fencer");
  });

  it("won't save an event with empty fields, and marks them", () => {
    saveDraft([{ ...newEventDraft(), ...FILLED_EVENT, weapon: "" }]);
    render(<NewTournamentForm />);
    const card = screen.getByRole("group", { name: "Event 1" });

    fireEvent.click(within(card).getByRole("button", { name: "Save event" }));

    expect(within(card).getByRole("alert")).toHaveTextContent("Fill in the highlighted fields");
    expect(within(card).getByRole("combobox", { name: "Weapon" })).toHaveAttribute("aria-invalid", "true");
    expect(within(card).getByRole("textbox", { name: "Event name" })).not.toHaveAttribute("aria-invalid", "true");
  });

  it("collapses a saved event to a summary, and reopens it with Edit", () => {
    saveDraft([{ ...newEventDraft(), ...FILLED_EVENT }]);
    render(<NewTournamentForm />);
    const card = screen.getByRole("group", { name: "Event 1" });

    fireEvent.click(within(card).getByRole("button", { name: "Save event" }));

    expect(within(card).queryByRole("textbox")).not.toBeInTheDocument();
    expect(card).toHaveTextContent("Foil · Women · Y14 · Open");
    expect(card).toHaveTextContent("Nov 20, 2026 at 09:00");

    fireEvent.click(within(card).getByRole("button", { name: "Edit" }));

    expect(within(card).getByRole("textbox", { name: "Event name" })).toHaveValue("Y14 Foil");
  });
});
