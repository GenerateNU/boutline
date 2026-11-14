import { render, screen } from "@testing-library/react";

import type { Tournament } from "@/features/tournament/types/tournament";

import { DashboardHeader } from "./dashboard-header";

const TOURNAMENT: Tournament = {
  id: "t1",
  name: "Northeastern Open",
  visibility: "public",
  code: "ABC123",
  status: "ended",
  created_by: "u1",
  start_time: null,
  city: "Oakland",
  country: "US",
  started_at: null,
  completed_at: null,
  created_at: "2026-10-06T12:00:00Z",
  updated_at: "2026-10-06T12:00:00Z",
  role: null,
};

describe("DashboardHeader", () => {
  it.each([
    {
      name: "ended with location and dates",
      tournament: TOURNAMENT,
      dates: "October 12 – October 14",
      badge: "Completed",
      present: ["Oakland, US", "October 12 – October 14"],
      absent: [],
    },
    {
      name: "pending with dates only",
      tournament: { ...TOURNAMENT, status: "pending", city: null, country: null } as Tournament,
      dates: "October 12",
      badge: "Scheduled",
      present: ["October 12"],
      absent: ["Oakland, US"],
    },
    {
      name: "pending with neither",
      tournament: { ...TOURNAMENT, status: "pending", city: null, country: null } as Tournament,
      dates: null,
      badge: "Scheduled",
      present: [],
      absent: ["Oakland, US", "October 12"],
    },
  ])("renders $name", ({ tournament, dates, badge, present, absent }) => {
    render(<DashboardHeader tournament={tournament} dates={dates} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Northeastern Open");
    expect(screen.getByText("Tournament Management Dashboard")).toBeInTheDocument();
    expect(screen.getByText(badge)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All tournaments" })).toHaveAttribute(
      "href",
      "/admin/tournaments",
    );
    for (const text of present) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    for (const text of absent) {
      expect(screen.queryByText(text)).not.toBeInTheDocument();
    }
  });
});
