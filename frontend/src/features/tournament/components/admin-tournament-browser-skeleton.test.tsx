import { render, screen } from "@testing-library/react";

import { AdminTournamentBrowserSkeleton } from "@/features/tournament/components/admin-tournament-browser-skeleton";

describe("AdminTournamentBrowserSkeleton", () => {
  it("announces loading and hides the placeholder cards", () => {
    const { container } = render(<AdminTournamentBrowserSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading tournaments");
    expect(container.querySelector("ul")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("ul > li")).toHaveLength(5);
  });

  it("renders the constant content for real", () => {
    render(<AdminTournamentBrowserSkeleton />);

    expect(screen.getByRole("link", { name: /Create a new tournament/ })).toHaveAttribute(
      "href",
      "/admin/tournaments/new",
    );
    expect(screen.getByRole("heading", { name: "Manage Tournaments" })).toBeInTheDocument();
    const tabs = screen.getByRole("navigation", { name: "Tournament status" });
    expect(tabs).toHaveTextContent("All");
    expect(tabs.querySelectorAll("a")).toHaveLength(4);
  });
});
