import { render, screen } from "@testing-library/react";

import { TournamentCard } from "@/features/tournament/components/tournament-card";
import type { Tournament } from "@/features/tournament/types/tournament";

const TOURNAMENT: Tournament = {
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
  role: null,
};

describe("TournamentCard", () => {
  it.each([
    {
      name: "public",
      admin: false,
      href: "/tournaments/t1",
      want: "Oakland, US",
      notWant: "Created Oct 6, 2026",
    },
    {
      name: "admin",
      admin: true,
      href: "/admin/tournaments/t1",
      want: "Created Oct 6, 2026",
      notWant: "Oakland, US",
    },
  ])("renders the $name link and meta line", ({ admin, href, want, notWant }) => {
    render(<TournamentCard tournament={TOURNAMENT} admin={admin} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", href);
    expect(screen.getByText("Northeastern Open")).toBeInTheDocument();
    expect(screen.getByText(want)).toBeInTheDocument();
    expect(screen.queryByText(notWant)).not.toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it.each([
    { name: "public", admin: false, want: "Upcoming" },
    { name: "admin", admin: true, want: "Scheduled" },
  ])("labels a pending tournament for the $name view", ({ admin, want }) => {
    render(<TournamentCard tournament={{ ...TOURNAMENT, status: "pending" }} admin={admin} />);

    expect(screen.getByText(want)).toBeInTheDocument();
  });

  it.each([
    { role: "admin" as const, want: "Admin", notWant: "Referee" },
    { role: "referee" as const, want: "Referee", notWant: "Admin" },
  ])("shows the caller's $role role", ({ role, want, notWant }) => {
    render(<TournamentCard tournament={{ ...TOURNAMENT, role }} admin />);

    expect(screen.getByText(want)).toBeInTheDocument();
    expect(screen.queryByText(notWant)).not.toBeInTheDocument();
  });

  it("shows no role when the caller has none", () => {
    render(<TournamentCard tournament={TOURNAMENT} admin />);

    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("Referee")).not.toBeInTheDocument();
  });
});
