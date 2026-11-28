import { render, screen } from "@testing-library/react";

import type { EventResult } from "../_types/event-result";
import { RankingList } from "./ranking-list";

const RESULTS: EventResult[] = [
  {
    place: 1,
    competitor_id: "c1",
    first_name: "Ada",
    last_name: "Lovelace",
    club: "Blades",
    rating: "A",
    rating_year: 26,
    decided_by: "direct_elimination",
  },
  {
    place: 2,
    competitor_id: "c2",
    first_name: "Bo",
    last_name: "Chen",
    club: null,
    rating: "B",
    rating_year: null,
    decided_by: "pool",
  },
];

describe("RankingList", () => {
  beforeEach(() => {
    render(<RankingList results={RESULTS} tournamentId="t1" eventId="e1" />);
  });

  it("shows the rating with its year only when there is one, and the club or a fallback", () => {
    expect(screen.getByText("A26")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText(/Blades/)).toBeInTheDocument();
    expect(screen.getByText(/No club/)).toBeInTheDocument();
  });

  it("links each row to the fencer page and offers no editing", () => {
    expect(screen.getByRole("link", { name: /Ada Lovelace/ })).toHaveAttribute(
      "href",
      "/tournaments/t1/events/e1/fencers/c1",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
