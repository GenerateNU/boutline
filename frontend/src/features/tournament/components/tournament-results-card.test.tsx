import { render, screen } from "@testing-library/react";

import { TournamentResultsCard } from "@/features/tournament/components/tournament-results-card";
import type { Tournament } from "@/features/tournament/types/tournament";

const tournament: Tournament = {
  id: "t1",
  name: "Generate Fencing Open",
  visibility: "public",
  code: "ABC123",
  status: "ended",
  created_by: "u1",
  start_time: null,
  city: "Boston",
  country: "US",
  started_at: null,
  completed_at: null,
  created_at: "2026-10-06T12:00:00Z",
  updated_at: "2026-10-06T12:00:00Z",
};

describe("TournamentResultsCard", () => {
  it.each([
    { name: "with a start date", start_time: "2026-10-19T09:00:00Z", want: "Oct 19, 2026 · 12 events" },
    { name: "without a start date", start_time: null, want: "12 events" },
  ])("renders $name", ({ start_time, want }) => {
    render(
      <TournamentResultsCard
        tournament={{ ...tournament, start_time }}
        eventCount={12}
        resultsHref="/tournaments/t1/results"
      />,
    );

    expect(screen.getByText(want)).toBeInTheDocument();
    expect(screen.getByText("Boston, US")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Results" })).toHaveAttribute(
      "href",
      "/tournaments/t1/results",
    );
  });
});
