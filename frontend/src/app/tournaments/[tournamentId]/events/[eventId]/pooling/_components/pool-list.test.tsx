import { fireEvent, render, screen, within } from "@testing-library/react";

import { poolBoards } from "../_services/pools";

import { PoolList } from "./pool-list";

const poolTitles = ["Pool 1 - Strip 3", "Pool 2 - Strip 4", "Pool 3 - Strip 5", "Pool 4 - Strip 2"];

function titlesIn(region: HTMLElement): string[] {
  return within(region)
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent ?? "");
}

function renderList(query: string) {
  render(<PoolList pools={poolBoards} poolingPath="/tournaments/t/events/e/pooling" eventId="e" />);
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
  beforeEach(() => localStorage.clear());

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

  it("collapses every card, then expands them all again", () => {
    renderList("");
    const expandedStates = () =>
      screen
        .getAllByRole("button", { name: /^Pool \d - Strip \d$/ })
        .map((trigger) => trigger.getAttribute("aria-expanded"));

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(expandedStates()).toEqual(["false", "false", "false", "false", "false"]);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(expandedStates()).toEqual(["true", "true", "true", "true", "true"]);
  });

  it("offers Expand all once every card is collapsed by hand", () => {
    renderList("strip 4");

    fireEvent.click(screen.getByRole("button", { name: "Pool 2 - Strip 4" }));

    expect(screen.getByRole("button", { name: "Expand all" })).toBeInTheDocument();
  });

  it("explains when nothing matches", () => {
    renderList("zzz");

    expect(screen.getByText('No pools match "zzz".')).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Pinned" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Collapse all" })).not.toBeInTheDocument();
  });

  it("filters by status across both sections and flags the trigger", () => {
    renderList("");

    applyFilter((sheet) => fireEvent.click(chip(sheet, "Finished")));

    expect(screen.queryByRole("region", { name: "Pinned" })).not.toBeInTheDocument();
    expect(titlesIn(screen.getByRole("region", { name: "All Pools" }))).toEqual([poolTitles[1]]);
    expect(screen.getByRole("button", { name: "Filter pools (filters applied)" })).toBeInTheDocument();
  });

  it("keeps the pinned section for pinned pools that pass the filter", () => {
    renderList("");

    applyFilter((sheet) => fireEvent.click(chip(sheet, "In Progress")));

    expect(titlesIn(screen.getByRole("region", { name: "Pinned" }))).toEqual([poolTitles[0]]);
    expect(titlesIn(screen.getByRole("region", { name: "All Pools" }))).toEqual([poolTitles[0], poolTitles[3]]);
  });

  it("filters by pool number", () => {
    renderList("");

    applyFilter((sheet) => fireEvent.click(chip(sheet, "Pool 3")));

    expect(titlesIn(screen.getByRole("region", { name: "All Pools" }))).toEqual([poolTitles[2]]);
  });

  it("filters by fencer name", () => {
    renderList("");

    applyFilter((sheet) => fireEvent.change(within(sheet).getByRole("searchbox", { name: "Fencer" }), { target: { value: "zoe" } }));

    expect(titlesIn(screen.getByRole("region", { name: "All Pools" }))).toEqual([poolTitles[3]]);
  });

  it.each([
    { sort: "Strip", order: [3, 0, 1, 2] },
    { sort: "Start time", order: [0, 1, 3, 2] },
  ])("sorts by $sort", ({ sort, order }) => {
    renderList("");

    applyFilter((sheet) => fireEvent.click(chip(sheet, sort)));

    expect(titlesIn(screen.getByRole("region", { name: "All Pools" }))).toEqual(order.map((index) => poolTitles[index]));
  });

  it("discards a draft that was never applied", () => {
    renderList("");
    const sheet = openFilterSheet();
    fireEvent.click(chip(sheet, "Finished"));

    fireEvent.click(within(sheet).getByRole("button", { name: "Close" }));

    expect(titlesIn(screen.getByRole("region", { name: "All Pools" }))).toEqual(poolTitles);
    expect(screen.getByRole("button", { name: "Filter pools" })).toBeInTheDocument();
  });

  it("clears every applied filter", () => {
    renderList("");
    applyFilter((sheet) => fireEvent.click(chip(sheet, "Finished")));

    applyFilter((sheet) => fireEvent.click(within(sheet).getByRole("button", { name: "Clear all" })));

    expect(titlesIn(screen.getByRole("region", { name: "All Pools" }))).toEqual(poolTitles);
  });

  it("explains when a search and filters match nothing", () => {
    renderList("zzz");

    applyFilter((sheet) => fireEvent.click(chip(sheet, "Finished")));

    expect(screen.getByText('No pools match "zzz" with these filters.')).toBeInTheDocument();
  });
});
