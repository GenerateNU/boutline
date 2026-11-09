import { render, screen, within } from "@testing-library/react";

import { poolBoards } from "../_services/pools";

import { PoolStandingsTable } from "./pool-standings-table";

describe("PoolStandingsTable", () => {
  it("names the columns by their accessible names", () => {
    render(<PoolStandingsTable pool={poolBoards[3]} />);

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
    render(<PoolStandingsTable pool={poolBoards[3]} />);

    const names = screen
      .getAllByRole("rowheader")
      .map((header) => header.querySelector("span")?.textContent);

    expect(names).toEqual([
      "Ava Johnson",
      "Oliver Brown",
      "Mateo Garcia",
      "Zoe Kim",
      "Lucas Martin",
      "Isla Nguyen",
      "Felix Wagner",
      "Nora Silva",
    ]);
  });

  it("shows the signed indicator in a fencer's row", () => {
    render(<PoolStandingsTable pool={poolBoards[3]} />);

    const row = screen.getByRole("row", { name: /Ava Johnson/ });

    expect(within(row).getByRole("cell", { name: "+4" })).toBeInTheDocument();
  });
});
