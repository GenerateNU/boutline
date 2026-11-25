import { render, screen } from "@testing-library/react";

import type { TournamentEvent } from "@/features/event/types/event";

import { EventHeader } from "./event-header";

const EVENT: TournamentEvent = {
  id: "e1",
  tournament_id: "t1",
  format: "pool_then_direct_elimination",
  name: "Div I-A Junior Mixed Foil",
  type: "individual",
  weapon: "foil",
  gender: null,
  age_category: "junior",
  rating_limit: null,
  qualifier: false,
  status: "active",
  start_time: "2026-10-12T10:00:00Z",
  started_at: null,
  completed_at: null,
  created_at: "2026-10-06T12:00:00Z",
  updated_at: "2026-10-06T12:00:00Z",
};

describe("EventHeader", () => {
  it.each([
    {
      name: "an active event with a start time",
      event: EVENT,
      competitorCount: 7,
      badge: "In Progress",
      present: ["10:00 AM", "7 competitors"],
      absent: [],
    },
    {
      name: "an upcoming event without a start time",
      event: { ...EVENT, status: "upcoming", start_time: null } as TournamentEvent,
      competitorCount: 1,
      badge: "Not Started",
      present: ["1 competitor"],
      absent: ["10:00 AM"],
    },
  ])("renders $name", ({ event, competitorCount, badge, present, absent }) => {
    render(<EventHeader event={event} competitorCount={competitorCount} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Div I-A Junior Mixed Foil",
    );
    expect(screen.getByText("Event Management Dashboard")).toBeInTheDocument();
    expect(screen.getByText(badge)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All events" })).toHaveAttribute(
      "href",
      "/admin/tournaments/t1/events",
    );
    for (const text of present) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    for (const text of absent) {
      expect(screen.queryByText(text)).not.toBeInTheDocument();
    }
  });
});
