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

function openFilterSheet() {
  fireEvent.click(screen.getByRole("button", { name: /^Filter pools/ }));
  return screen.getByRole("dialog", { name: "Filter" });
}

function applyFilter(choose: (sheet: HTMLElement) => void) {
  const sheet = openFilterSheet();
  choose(sheet);
  fireEvent.click(within(sheet).getByRole("button", { name: "Show pools" }));
}

function chip(sheet: HTMLElement, name: string) {
  return within(sheet).getByRole("radio", { name });
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

  it("collapses every card, then expands them all again", () => {
    renderList("");
    const expandedStates = () =>
      screen
        .getAllByRole("button", { name: /^Pool \d · Strip \d$/ })
        .map((trigger) => trigger.getAttribute("aria-expanded"));

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(expandedStates()).toEqual(["false", "false", "false", "false"]);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(expandedStates()).toEqual(["true", "true", "true", "true"]);
  });

  it("offers Expand all once every card is collapsed by hand", () => {
    renderList("strip 4");

    fireEvent.click(screen.getByRole("button", { name: "Pool 2 · Strip 4" }));

    expect(screen.getByRole("button", { name: "Expand all" })).toBeInTheDocument();
  });

  it("explains when nothing matches", () => {
    renderList("zzz");

    expect(screen.getByText('No pools match "zzz".')).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Collapse all" })).not.toBeInTheDocument();
  });

  it("filters by status and flags the trigger", () => {
    renderList("");

    applyFilter((sheet) => fireEvent.click(chip(sheet, "Completed")));

    expect(titles()).toEqual([poolTitles[1]]);
    expect(screen.getByRole("button", { name: "Filter pools (filters applied)" })).toBeInTheDocument();
  });

  it("filters by pool number", () => {
    renderList("");

    applyFilter((sheet) => fireEvent.click(chip(sheet, "Pool 3")));

    expect(titles()).toEqual([poolTitles[2]]);
  });

  it("filters by fencer name", () => {
    renderList("");

    applyFilter((sheet) => fireEvent.change(within(sheet).getByRole("searchbox", { name: "Fencer" }), { target: { value: "zoe" } }));

    expect(titles()).toEqual([poolTitles[3]]);
  });

  it.each([
    { sort: "Strip", order: [3, 0, 1, 2] },
    { sort: "Start time", order: [0, 1, 3, 2] },
  ])("sorts by $sort", ({ sort, order }) => {
    renderList("");

    applyFilter((sheet) => fireEvent.click(chip(sheet, sort)));

    expect(titles()).toEqual(order.map((index) => poolTitles[index]));
  });

  it("discards a draft that was never applied", () => {
    renderList("");
    const sheet = openFilterSheet();
    fireEvent.click(chip(sheet, "Completed"));

    fireEvent.click(within(sheet).getByRole("button", { name: "Close" }));

    expect(titles()).toEqual(poolTitles);
    expect(screen.getByRole("button", { name: "Filter pools" })).toBeInTheDocument();
  });

  it("clears every applied filter", () => {
    renderList("");
    applyFilter((sheet) => fireEvent.click(chip(sheet, "Completed")));

    applyFilter((sheet) => fireEvent.click(within(sheet).getByRole("button", { name: "Clear All" })));

    expect(titles()).toEqual(poolTitles);
  });

  it("explains when a search and filters match nothing", () => {
    renderList("zzz");

    applyFilter((sheet) => fireEvent.click(chip(sheet, "Completed")));

    expect(screen.getByText('No pools match "zzz" with these filters.')).toBeInTheDocument();
  });
});
