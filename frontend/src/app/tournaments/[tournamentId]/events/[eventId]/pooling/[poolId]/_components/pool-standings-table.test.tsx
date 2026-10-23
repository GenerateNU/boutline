import { render, screen, within } from "@testing-library/react";

import { poolBoards } from "../../_services/pools";

import { PoolStandingsTable } from "./pool-standings-table";

describe("PoolStandingsTable", () => {
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
