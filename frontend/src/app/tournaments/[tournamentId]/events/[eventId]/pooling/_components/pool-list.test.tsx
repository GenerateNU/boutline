import { fireEvent, render, screen, within } from "@testing-library/react";

import { poolBoards } from "../_services/pools";

import { PoolList } from "./pool-list";

const poolTitles = ["Pool 1 - Strip 3", "Pool 2 - Strip 4", "Pool 3 - Strip 5"];

function titlesIn(region: HTMLElement): string[] {
  return within(region)
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent ?? "");
}

function renderList(query: string) {
  render(<PoolList pools={poolBoards} poolingPath="/tournaments/t/events/e/pooling" />);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search pools" }), { target: { value: query } });
}

describe("PoolList", () => {
  it.each([
    { query: "", pinned: [poolTitles[0]], all: poolTitles },
    { query: "strip 4", pinned: null, all: [poolTitles[1]] },
    { query: "caitlin", pinned: [poolTitles[0]], all: [poolTitles[0]] },
  ])("lists pools for search '$query'", ({ query, pinned, all }) => {
    renderList(query);

    if (pinned) {
      expect(titlesIn(screen.getByRole("region", { name: "Pinned" }))).toEqual(pinned);
    } else {
      expect(screen.queryByRole("region", { name: "Pinned" })).not.toBeInTheDocument();
    }
    expect(titlesIn(screen.getByRole("region", { name: "All Pools" }))).toEqual(all);
  });

  it("explains when nothing matches", () => {
    renderList("zzz");

    expect(screen.getByText('No pools match "zzz".')).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Pinned" })).not.toBeInTheDocument();
  });
});
