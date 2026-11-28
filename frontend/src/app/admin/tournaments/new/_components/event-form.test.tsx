import { fireEvent, render, screen } from "@testing-library/react";

import { EventDraft } from "../_types/tournament-draft";
import { EMPTY_TOURNAMENT_DRAFT, newEventDraft } from "../tournament-draft-helpers";
import { EventForm } from "./event-form";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

const DRAFT_KEY = "account:tournament-creation-draft";

const FILLED_EVENT = {
  name: "Y14 Foil",
  date: "2026-11-20",
  time: "09:00",
  weapon: "foil",
  genderMix: "female",
  ageCategory: "Y14",
  ratingLevel: "Open",
  qualifier: "No",
};

function saveDraft(event: EventDraft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...EMPTY_TOURNAMENT_DRAFT, events: [event] }));
}

function storedEvents(): EventDraft[] {
  return JSON.parse(sessionStorage.getItem(DRAFT_KEY)!).events;
}

describe("EventForm", () => {
  beforeEach(() => mockPush.mockClear());
  afterEach(() => sessionStorage.clear());

  it("edits the draft's event in place, chips included", () => {
    const event = newEventDraft();
    saveDraft(event);
    render(<EventForm eventId={event.id} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Event name" }), { target: { value: "Cadet Epee" } });
    fireEvent.click(screen.getByRole("radio", { name: "Epee" }));
    fireEvent.click(screen.getByRole("radio", { name: "Men's" }));

    expect(storedEvents()[0]).toMatchObject({ name: "Cadet Epee", weapon: "epee", genderMix: "male" });
  });

  it.each([
    { case: "an unfinished event stays and marks why", event: { name: "Y14 Foil" }, goesBack: false },
    { case: "a finished event goes back to the tournament", event: FILLED_EVENT, goesBack: true },
  ])("on Continue, $case", ({ event: fields, goesBack }) => {
    const event = { ...newEventDraft(), ...fields };
    saveDraft(event);
    render(<EventForm eventId={event.id} />);

    fireEvent.submit(screen.getByRole("button", { name: "Continue" }).closest("form")!);

    if (goesBack) {
      expect(mockPush).toHaveBeenCalledWith("/admin/tournaments/new");
    } else {
      expect(mockPush).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent("Fill in the highlighted fields to add this event.");
      expect(screen.getByRole("radiogroup", { name: "Weapon" })).toHaveAttribute("aria-invalid", "true");
    }
  });

  it("empties the event's fields with Clear All, keeping it in the draft", () => {
    const event = { ...newEventDraft(), ...FILLED_EVENT };
    saveDraft(event);
    render(<EventForm eventId={event.id} />);

    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));

    expect(screen.getByRole("textbox", { name: "Event name" })).toHaveValue("");
    expect(storedEvents()).toEqual([expect.objectContaining({ id: event.id, name: "", weapon: "" })]);
  });

  it("says so when the event isn't in the draft", () => {
    saveDraft(newEventDraft());
    render(<EventForm eventId="missing" />);

    expect(screen.getByText(/isn't in the tournament draft any more/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the tournament" })).toHaveAttribute("href", "/admin/tournaments/new");
  });
});
