import { fireEvent, render, screen, within } from "@testing-library/react";

import { poolBoards } from "../_services/pools";

import { PoolList } from "./pool-list";

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
