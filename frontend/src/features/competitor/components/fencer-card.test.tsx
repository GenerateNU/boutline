import { fireEvent, render, screen } from "@testing-library/react";

import { FencerCard } from "@/features/competitor/components/fencer-card";
import { PINNED_STORAGE_KEY } from "@/features/pinning/types/pinning";
import type { Competitor } from "@/types/competitor";

const YAN: Competitor = {
  id: "c-1",
  eventId: "e1",
  tournamentId: "t1",
  firstName: "Yan",
  lastName: "Wang",
  rating: "A",
  ratingYear: 26,
  team: "Boston Blade Club",
  checkedInAt: null,
};

describe("FencerCard", () => {
  beforeEach(() => sessionStorage.clear());

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
    { rating: "A", ratingYear: 26, want: "A26" },
    { rating: "U", ratingYear: null, want: "U" },
  ])("shows the rating badge $want", ({ rating, ratingYear, want }) => {
    render(<FencerCard competitor={{ ...YAN, rating, ratingYear }} />);

    expect(screen.getByText(want)).toBeInTheDocument();
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
    { name: "pins", clicks: 1, pressed: "true", label: "Unpin Yan Wang", stored: ["c-1"] },
    { name: "unpins", clicks: 2, pressed: "false", label: "Pin Yan Wang", stored: [] },
  ])("$name the fencer after $clicks click(s) on the pin", ({ clicks, pressed, label, stored }) => {
    render(<FencerCard competitor={YAN} />);

    for (let i = 0; i < clicks; i++) {
      fireEvent.click(screen.getByRole("button", { name: /pin Yan Wang/i }));
    }

    expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", pressed);
    const raw = sessionStorage.getItem(PINNED_STORAGE_KEY);
    expect(raw ? JSON.parse(raw).fencerIds : []).toEqual(stored);
  });

  it("is a button instead of a link to the fencer's page when it opens something in place", () => {
    render(<FencerCard competitor={YAN} onSelect={() => {}} />);

    expect(screen.getByRole("button", { name: /^Yan Wang/ })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
