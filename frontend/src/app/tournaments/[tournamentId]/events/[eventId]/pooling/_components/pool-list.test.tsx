import { act, fireEvent, render, screen, within } from "@testing-library/react";

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
  fireEvent.change(screen.getByRole("searchbox", { name: "Search fencers or clubs" }), { target: { value: query } });
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

function typeInSearch(query: string) {
  render(<PoolList pools={poolBoards} poolingPath="/tournaments/t/events/e/pooling" />);
  const search = screen.getByRole("searchbox", { name: "Search fencers or clubs" });
  act(() => search.focus());
  fireEvent.change(search, { target: { value: query } });
  return search;
}

function suggestions(group: string): string[] {
  const section = screen.queryByRole("region", { name: group });
  return section ? within(section).getAllByRole("button").map((button) => button.textContent ?? "") : [];
}

describe("PoolList search suggestions", () => {
  it.each([
    {
      query: "",
      fencers: ["Amara Okafor", "Caitlin Lee", "Ethan Kowalski", "Mateo Garcia", "Maya Chen"],
      clubs: ["Boston Fencing Club", "Cambridge FC", "MIT Fencing", "New York Fencers Club"],
    },
    { query: "zoe", fencers: ["Zoe Kim"], clubs: [] },
    { query: "cambridge", fencers: [], clubs: ["Cambridge FC"] },
    { query: "new", fencers: [], clubs: ["New York Fencers Club"] },
    { query: "zzz", fencers: [], clubs: [] },
  ])("splits matches for '$query' into fencers and clubs", ({ query, fencers, clubs }) => {
    typeInSearch(query);

    expect(suggestions("Fencers")).toEqual(fencers);
    expect(suggestions("Clubs")).toEqual(clubs);
  });

  it("searches for a picked suggestion and closes the list", () => {
    const search = typeInSearch("cambridge");

    fireEvent.click(screen.getByRole("button", { name: "Cambridge FC" }));

    expect(search).toHaveValue("Cambridge FC");
    expect(screen.queryByRole("region", { name: "Clubs" })).not.toBeInTheDocument();
    expect(titles()).toEqual([poolTitles[1], poolTitles[2], poolTitles[3]]);
  });
});

describe("PoolList", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

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

  it("filters by status and flags the trigger", () => {
    renderList("");

    applyFilter((sheet) => fireEvent.click(chip(sheet, "Completed")));

    expect(titles()).toEqual([poolTitles[1]]);
    expect(screen.getByRole("button", { name: "Filter pools (filters applied)" })).toHaveAttribute("aria-pressed", "true");
  });

  it("filters by pool number", () => {
    renderList("");

    applyFilter((sheet) => fireEvent.click(chip(sheet, "Pool 3")));

    expect(titles()).toEqual([poolTitles[2]]);
  });

  it.each([
    { field: "Fencer", query: "zoe", pick: "Zoe Kim", pools: [poolTitles[3]] },
    { field: "Club", query: "cambridge", pick: "Cambridge FC", pools: [poolTitles[1], poolTitles[2], poolTitles[3]] },
  ])("filters by a picked $field", ({ field, query, pick, pools }) => {
    renderList("");

    applyFilter((sheet) => {
      fireEvent.change(within(sheet).getByRole("searchbox", { name: field }), { target: { value: query } });
      fireEvent.click(within(sheet).getByRole("button", { name: pick }));
      expect(within(sheet).getByRole("button", { name: `Remove ${pick}` })).toBeInTheDocument();
    });

    expect(titles()).toEqual(pools);
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

  function pin(title: string) {
    fireEvent.click(screen.getByRole("button", { name: `Pin ${title}` }));
  }

  it.each([
    { case: "one pinned pool", pins: [poolTitles[2]], order: [2, 0, 1, 3] },
    { case: "pinned pools, alphabetically", pins: [poolTitles[3], poolTitles[1]], order: [1, 3, 0, 2] },
  ])("puts $case at the top", ({ pins, order }) => {
    renderList("");

    pins.forEach(pin);

    expect(titles()).toEqual(order.map((index) => poolTitles[index]));
  });

  it("keeps pinned pools on top of the chosen sort", () => {
    renderList("");
    pin(poolTitles[0]);

    applyFilter((sheet) => fireEvent.click(chip(sheet, "Strip")));

    // Pool 1 is pinned; the rest follow by strip: 2, 4, 5.
    expect(titles()).toEqual([poolTitles[0], poolTitles[3], poolTitles[1], poolTitles[2]]);
  });

  it("unpins a pool back into its place", () => {
    renderList("");
    pin(poolTitles[2]);

    fireEvent.click(screen.getByRole("button", { name: `Unpin ${poolTitles[2]}` }));

    expect(titles()).toEqual(poolTitles);
    expect(screen.getByRole("button", { name: `Pin ${poolTitles[2]}` })).toHaveAttribute("aria-pressed", "false");
  });
});
