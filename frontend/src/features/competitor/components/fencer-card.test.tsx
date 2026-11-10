import { fireEvent, render, screen } from "@testing-library/react";

import { FencerCard } from "@/features/competitor/components/fencer-card";
import type { Competitor } from "@/types/competitor";

const yan: Competitor = {
  id: "c-1",
  eventId: "e1",
  firstName: "Yan",
  lastName: "Wang",
  rating: "A",
  ratingYear: 26,
  team: "Boston Blade Club",
};

describe("FencerCard", () => {
  it.each([
    { team: "Boston Blade Club", wantClub: "Boston Blade Club" },
    { team: "", wantClub: "No club" },
  ])("shows the name, rating and club '$wantClub'", ({ team, wantClub }) => {
    render(<FencerCard competitor={{ ...yan, team }} />);

    expect(screen.getByText("Yan Wang")).toBeInTheDocument();
    expect(screen.getByText("A26")).toBeInTheDocument();
    expect(screen.getByText(wantClub, { exact: false })).toBeInTheDocument();
  });

  it.each([
    { name: "with an href", href: "/tournaments/t1/events/e1/fencers/c-1", wantLink: true },
    { name: "without one", href: undefined, wantLink: false },
  ])("links $name", ({ href, wantLink }) => {
    render(<FencerCard competitor={yan} href={href} />);

    const link = screen.queryByRole("link");
    if (wantLink) {
      expect(link).toHaveAttribute("href", href);
    } else {
      expect(link).toBeNull();
    }
  });

  it.each([
    { pinned: true, label: "Unpin Yan Wang" },
    { pinned: false, label: "Pin Yan Wang" },
  ])("toggles a pin when pinned is $pinned", ({ pinned, label }) => {
    const onTogglePin = jest.fn();
    render(<FencerCard competitor={yan} pinned={pinned} onTogglePin={onTogglePin} />);

    const button = screen.getByRole("button", { name: label });
    expect(button).toHaveAttribute("aria-pressed", String(pinned));
    fireEvent.click(button);
    expect(onTogglePin).toHaveBeenCalled();
  });

  it("shows an unpinned pin even before pinning is wired up", () => {
    render(<FencerCard competitor={yan} />);

    expect(screen.getByRole("button", { name: "Pin Yan Wang" })).toHaveAttribute("aria-pressed", "false");
  });
});
