import { render, screen } from "@testing-library/react";

import { TournamentBrowserSkeleton } from "@/features/tournament/components/tournament-browser-skeleton";

describe("TournamentBrowserSkeleton", () => {
  it("announces loading and hides the placeholder shapes", () => {
    const { container } = render(<TournamentBrowserSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading tournaments");
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });
});
