import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { EventDraft, TournamentDraft } from "../_types/tournament-draft";
import { EMPTY_TOURNAMENT_DRAFT, newEventDraft } from "../tournament-draft-helpers";
import { EventForm } from "./event-form";

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

function saveDraft(event: EventDraft, tournament: Partial<TournamentDraft> = {}) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...EMPTY_TOURNAMENT_DRAFT, ...tournament, events: [event] }));
}

function storedEvents(): EventDraft[] {
  return JSON.parse(sessionStorage.getItem(DRAFT_KEY)!).events;
}

function mockDelete(status: number) {
  global.fetch = jest.fn(async () => ({
    status,
    ok: status < 400,
    json: async () => (status < 400 ? null : { detail: "Server exploded" }),
  })) as unknown as typeof fetch;
}

describe("EventForm", () => {
  beforeEach(() => mockPush.mockClear());
  afterEach(() => sessionStorage.clear());

  it("edits the draft's event in place, chips included", () => {
    const event = newEventDraft();
    saveDraft(event);
    render(<EventForm eventId={event.id} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Event name" }), { target: { value: "Cadet Epee" } });
    fireEvent.click(screen.getByRole("radio", { name: "Épée" }));
    fireEvent.click(screen.getByRole("radio", { name: "Male" }));

    expect(storedEvents()[0]).toMatchObject({ name: "Cadet Epee", weapon: "Épée", genderMix: "Male" });
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

  it.each([
    { case: "an unsent event", event: { eventId: undefined }, status: 204, removed: true },
    { case: "a sent event once the server deletes it", event: { eventId: "e1", saved: true }, status: 204, removed: true },
    { case: "nothing when the server fails", event: { eventId: "e1", saved: true }, status: 500, removed: false },
  ])("Remove event removes $case", async ({ event: patch, status, removed }) => {
    mockDelete(status);
    const event = { ...newEventDraft(), ...FILLED_EVENT, ...patch };
    saveDraft(event, { tournamentId: "t1", saved: true });
    render(<EventForm eventId={event.id} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove event" }));

    if (removed) {
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/admin/tournaments/new"));
      expect(storedEvents()).toEqual([]);
    } else {
      expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't remove this event");
      expect(mockPush).not.toHaveBeenCalled();
      expect(storedEvents()).toHaveLength(1);
    }
  });

  it("says so when the event isn't in the draft", () => {
    saveDraft(newEventDraft());
    render(<EventForm eventId="missing" />);

    expect(screen.getByText(/isn't in the tournament draft any more/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the tournament" })).toHaveAttribute("href", "/admin/tournaments/new");
  });
});
