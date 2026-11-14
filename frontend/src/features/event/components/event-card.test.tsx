import { render, screen } from "@testing-library/react";

import { EventCard } from "@/features/event/components/event-card";
import type { TournamentEvent } from "@/features/event/types/event";

const EVENT: TournamentEvent = {
  id: "e1",
  tournament_id: "t1",
  format: "pool_then_direct_elimination",
  name: "U15 Mixed Épée",
  status: "ended",
  type: null,
  weapon: null,
  gender: null,
  age_category: null,
  rating_limit: null,
  qualifier: false,
  start_time: "2026-10-05T13:00:00Z",
  started_at: null,
  completed_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("EventCard", () => {
  it.each([
    { competitorCount: 0, want: "0 competitors" },
    { competitorCount: 1, want: "1 competitor" },
    { competitorCount: 5, want: "5 competitors" },
  ])("shows $want", ({ competitorCount, want }) => {
    render(<EventCard event={EVENT} competitorCount={competitorCount} />);

    expect(screen.getByText(want)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/tournaments/t1/events/e1");
  });
});
