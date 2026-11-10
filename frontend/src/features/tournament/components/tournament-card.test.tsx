import { render, screen } from "@testing-library/react";

import { TournamentCard } from "@/features/tournament/components/tournament-card";
import type { Tournament } from "@/features/tournament/types/tournament";

const tournament: Tournament = {
  id: "t1",
  name: "Northeastern Open",
  visibility: "public",
  code: "ABC123",
  status: "active",
  created_by: "u1",
  start_time: null,
  city: "Oakland",
  country: "US",
  started_at: null,
  completed_at: null,
  created_at: "2026-10-06T12:00:00Z",
  updated_at: "2026-10-06T12:00:00Z",
};

describe("TournamentCard", () => {
  it.each([
    { name: "public", admin: false, want: "Oakland, US", notWant: "Created Oct 6, 2026" },
    { name: "admin", admin: true, want: "Created Oct 6, 2026", notWant: "Oakland, US" },
  ])("renders the $name meta line", ({ admin, want, notWant }) => {
    render(<TournamentCard tournament={tournament} admin={admin} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/tournaments/t1");
    expect(screen.getByText("Northeastern Open")).toBeInTheDocument();
    expect(screen.getByText(want)).toBeInTheDocument();
    expect(screen.queryByText(notWant)).not.toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });
});
