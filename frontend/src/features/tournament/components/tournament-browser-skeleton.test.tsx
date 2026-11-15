import { render, screen } from "@testing-library/react";

import { TournamentBrowserSkeleton } from "@/features/tournament/components/tournament-browser-skeleton";

const CURRENT_PARAMS = new URLSearchParams("q=summer&status=active");

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/tournaments",
  useSearchParams: () => CURRENT_PARAMS,
}));

describe("TournamentBrowserSkeleton", () => {
  it("announces loading without a role on the root", () => {
    const { container } = render(<TournamentBrowserSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading tournaments");
    expect(container.firstElementChild).not.toHaveAttribute("role");
  });

  it("renders the real heading, search and filters, with only the cards as blocks", () => {
    const { container } = render(<TournamentBrowserSkeleton />);

    expect(screen.getByRole("heading", { name: "Tournaments" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search tournaments" })).toHaveValue("summer");
    expect(screen.getByRole("button", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Active filters" })).toHaveTextContent("Status: In Progress");
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });
});
