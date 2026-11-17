import { render, screen, within } from "@testing-library/react";

import { PoolTable } from "@/features/pool/components/pool-table";
import type { PoolTableData } from "@/features/pool/types/pool-table";

function grid(fencers: number): PoolTableData {
  const indexes = Array.from({ length: fencers }, (_, index) => index);
  return {
    headers: indexes.map((index) => String(index + 1)),
    rows: indexes.map((row) => ({
      name: `Fencer ${row + 1}`,
      team: "Club",
      cells: indexes.map((column) =>
        column === row ? { kind: "self" } : { kind: "bout", label: "", result: null, boutId: null },
      ),
    })),
  };
}

describe("PoolTable", () => {
  it.each([
    { fencers: 4, scrolls: false },
    { fencers: 6, scrolls: false },
    { fencers: 7, scrolls: true },
    { fencers: 8, scrolls: true },
  ])("with $fencers fencers, scrolls sideways: $scrolls", ({ fencers, scrolls }) => {
    render(<PoolTable caption="Pool bouts" data={grid(fencers)} />);

    const region = screen.queryByRole("region", { name: "Pool bouts" });
    if (scrolls) {
      expect(region).toHaveAttribute("tabindex", "0");
      expect(within(region!).getByRole("table", { name: "Pool bouts" })).toBeInTheDocument();
    } else {
      expect(region).not.toBeInTheDocument();
    }
    expect(screen.getAllByRole("rowheader")).toHaveLength(fencers);
  });
});
