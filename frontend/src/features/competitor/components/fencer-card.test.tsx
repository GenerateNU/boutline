import { fireEvent, render, screen } from "@testing-library/react";

import { FencerCard } from "@/features/competitor/components/fencer-card";
import type { Competitor } from "@/types/competitor";

const YAN: Competitor = {
  id: "c-1",
  eventId: "e1",
  tournamentId: "t1",
  firstName: "Yan",
  lastName: "Wang",
  rating: "A26",
  ratingYear: 26,
  team: "Boston Blade Club",
};

describe("FencerCard", () => {
  it.each([
    { team: "Boston Blade Club", wantClub: "Boston Blade Club" },
    { team: "", wantClub: "No club" },
  ])("shows the name, rating and club '$wantClub'", ({ team, wantClub }) => {
    render(<FencerCard competitor={{ ...YAN, team }} />);

    expect(screen.getByText("Yan Wang")).toBeInTheDocument();
    expect(screen.getByText("A26")).toBeInTheDocument();
    expect(screen.getByText(wantClub, { exact: false })).toBeInTheDocument();
  });

  it.each([
    { name: "in a tournament", tournamentId: "t1", want: "/tournaments/t1/events/e1/fencers/c-1" },
    { name: "with an empty tournament id", tournamentId: "", want: null },
    { name: "without a tournament", tournamentId: undefined, want: null },
  ])("links to the fencer's page $name", ({ tournamentId, want }) => {
    render(<FencerCard competitor={{ ...YAN, tournamentId }} />);

    const link = screen.queryByRole("link");
    if (want) {
      expect(link).toHaveAttribute("href", want);
    } else {
      expect(link).toBeNull();
    }
  });

  it.each([
    { pinned: true, label: "Unpin Yan Wang" },
    { pinned: false, label: "Pin Yan Wang" },
  ])("toggles a pin when pinned is $pinned", ({ pinned, label }) => {
    const onTogglePin = jest.fn();
    render(<FencerCard competitor={YAN} pinned={pinned} onTogglePin={onTogglePin} />);

    const button = screen.getByRole("button", { name: label });
    expect(button).toHaveAttribute("aria-pressed", String(pinned));
    fireEvent.click(button);
    expect(onTogglePin).toHaveBeenCalled();
  });

  it("shows a pin button even before pinning is wired up", () => {
    render(<FencerCard competitor={YAN} pinned={false} />);

    expect(screen.getByRole("button", { name: "Pin Yan Wang" })).toHaveAttribute("aria-pressed", "false");
  });
});
