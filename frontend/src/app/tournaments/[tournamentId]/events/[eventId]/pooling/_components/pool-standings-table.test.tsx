import { render, screen, within } from "@testing-library/react";

import { buildPool } from "../_fixtures/build-pool";

import { PoolStandingsTable } from "./pool-standings-table";

// Listed in pool order; the table orders them by place.
const pool = buildPool({
  number: 1,
  fencers: [
    ["Zoe", "Kim", "Cambridge FC", { place: 3, touches_scored: 6, touches_received: 9, indicator: -3 }],
    ["Ava", "Johnson", "MIT Fencing", { place: 1, touches_scored: 10, touches_received: 6, indicator: 4 }],
    ["Noah", "Park", "Boston Fencing Club", { place: 2, touches_scored: 8, touches_received: 7, indicator: 1 }],
  ],
});

describe("PoolStandingsTable", () => {
  it("names the columns by their accessible names", () => {
    render(<PoolStandingsTable pool={pool} />);

    const names = screen.getAllByRole("columnheader").map((header) => header.textContent);

    // The visible "#" is aria-hidden, so textContent carries both; match on the accessible tail.
    expect(names.map((name) => (name === "#Place" ? "Place" : name))).toEqual([
      "Place",
      "Fencer",
      "V",
      "V/M",
      "TS",
      "TR",
      "Ind",
    ]);
    expect(screen.getByRole("columnheader", { name: "Place" })).toBeInTheDocument();
  });

  it("lists fencers in standing order as row headers", () => {
    render(<PoolStandingsTable pool={pool} />);

    const names = screen
      .getAllByRole("rowheader")
      .map((header) => header.querySelector("span")?.textContent);

    expect(names).toEqual(["Johnson, Ava", "Park, Noah", "Kim, Zoe"]);
  });

  it.each([
    { fencer: /Johnson, Ava/, indicator: "+4" },
    { fencer: /Kim, Zoe/, indicator: "-3" },
  ])("shows the signed indicator $indicator in a fencer's row", ({ fencer, indicator }) => {
    render(<PoolStandingsTable pool={pool} />);

    const row = screen.getByRole("row", { name: fencer });

    expect(within(row).getByRole("cell", { name: indicator })).toBeInTheDocument();
  });
});
