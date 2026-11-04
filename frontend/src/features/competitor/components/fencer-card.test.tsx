import { render, screen } from "@testing-library/react";

import { FencerCard } from "@/features/competitor/components/fencer-card";

describe("FencerCard", () => {
  it.each([
    { rating: "A", team: "Boston Blade Club", wantClub: "Boston Blade Club" },
    { rating: "U", team: "", wantClub: "No club" },
  ])("renders rating $rating with club '$team'", ({ rating, team, wantClub }) => {
    render(
      <FencerCard
        competitor={{ id: "c-1", firstName: "Yan", lastName: "Wang", rating, team }}
        href="/tournaments/t1/events/e1/fencers/c-1"
      />,
    );

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/tournaments/t1/events/e1/fencers/c-1",
    );
    expect(screen.getByText("Yan Wang")).toHaveClass("uppercase");
    expect(screen.getByText(`- ${wantClub}`, { exact: false })).toHaveTextContent(
      `- ${wantClub}`,
    );
    expect(screen.getByText(rating)).toHaveClass("bg-foreground", "text-background");
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});
