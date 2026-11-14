import { fireEvent, render, screen, within } from "@testing-library/react";

import { buildPool } from "../_fixtures/build-pool";

import { PoolList } from "./pool-list";

const poolBoards = [
  buildPool({
    number: 1,
    strip: "Strip 3",
    status: "active",
    start_time: "2026-10-24T09:00:00Z",
    fencers: [
      ["Yan", "Wang", "New York Fencers Club"],
      ["Caitlin", "Lee", "New York Fencers Club"],
    ],
  }),
  buildPool({
    number: 2,
    strip: "Strip 4",
    status: "ended",
    start_time: "2026-10-24T09:30:00Z",
    fencers: [
      ["Maya", "Chen", "Boston Fencing Club"],
      ["Priya", "Patel", "Cambridge FC"],
    ],
  }),
  buildPool({
    number: 3,
    strip: "Strip 5",
    status: "upcoming",
    fencers: [
      ["Amara", "Okafor", "Cambridge FC"],
      ["Ethan", "Kowalski", "MIT Fencing"],
    ],
  }),
  buildPool({
    number: 4,
    strip: "Strip 2",
    status: "active",
    start_time: "2026-10-24T10:00:00Z",
    fencers: [
      ["Zoe", "Kim", "New York Fencers Club"],
      ["Mateo", "Garcia", "Cambridge FC"],
    ],
  }),
];

const poolTitles = ["Pool 1 · Strip 3", "Pool 2 · Strip 4", "Pool 3 · Strip 5", "Pool 4 · Strip 2"];

function titles(): string[] {
  return screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent ?? "");
}

function renderList(query: string) {
  render(<PoolList pools={poolBoards} poolingPath="/tournaments/t/events/e/pooling" />);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search pools" }), { target: { value: query } });
}

describe("PoolList", () => {
  it.each([
    { query: "", all: poolTitles },
    { query: "strip 4", all: [poolTitles[1]] },
    { query: "caitlin", all: [poolTitles[0]] },
  ])("lists pools for search '$query'", ({ query, all }) => {
    renderList(query);

    expect(within(screen.getByRole("list", { name: "Pools" })).getAllByRole("listitem")).toHaveLength(all.length);
    expect(titles()).toEqual(all);
  });

  it("explains when nothing matches", () => {
    renderList("zzz");

    expect(screen.getByText('No pools match "zzz".')).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Pools" })).not.toBeInTheDocument();
  });
});
