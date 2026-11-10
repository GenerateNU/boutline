import { fireEvent, render, screen } from "@testing-library/react";

import { PinnedFencerCard } from "@/features/pinning/components/pinned-fencer-card";
import type { Competitor } from "@/types/competitor";

const base: Competitor = {
  id: "c-1",
  eventId: "e1",
  tournamentId: "t1",
  firstName: "Annika",
  lastName: "Kim",
  rating: "A",
  ratingYear: 26,
  team: "Boston Blade Club",
};

function renderCard(changes: Partial<Competitor> = {}, onUnpin = jest.fn()) {
  render(<PinnedFencerCard competitor={{ ...base, ...changes }} onUnpin={onUnpin} />);
}

describe("PinnedFencerCard", () => {
  it("shows the fencer's name", () => {
    renderCard();
    expect(screen.getByText("Annika Kim")).toBeInTheDocument();
  });

  it.each([
    { team: "Boston Blade Club", want: "Boston Blade Club" },
    { team: "", want: "No club" },
  ])("shows $want for team '$team'", ({ team, want }) => {
    renderCard({ team });
    expect(screen.getByText(want, { exact: false })).toBeInTheDocument();
  });

  it.each([
    { rating: "A", ratingYear: 26, want: "A26" },
    { rating: "U", ratingYear: null, want: "U" },
  ])("shows rating $want", ({ rating, ratingYear, want }) => {
    renderCard({ rating, ratingYear });
    expect(screen.getByText(want)).toBeInTheDocument();
  });

  it.each([
    { name: "with a tournament", tournamentId: "t1", want: "/tournaments/t1/events/e1/fencers/c-1" },
    { name: "with an empty tournament id", tournamentId: "", want: null },
    { name: "without a tournament", tournamentId: undefined, want: null },
  ])("links to the fencer's page $name", ({ tournamentId, want }) => {
    renderCard({ tournamentId });
    const link = screen.queryByRole("link");
    if (want) {
      expect(link).toHaveAttribute("href", want);
    } else {
      expect(link).toBeNull();
    }
  });

  it("has a pressed pin button that unpins", () => {
    const onUnpin = jest.fn();
    renderCard({}, onUnpin);

    const button = screen.getByRole("button", { name: "Unpin Annika Kim" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(onUnpin).toHaveBeenCalled();
  });
});
