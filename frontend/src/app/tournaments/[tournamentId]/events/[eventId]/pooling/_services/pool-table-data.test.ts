import { PoolBoard, PoolBout, PoolFencer } from "../_types/pool-board";

import { boutsTable, standingsTable } from "./pool-table-data";

function fencer(id: string, position: number, ratio = 0): PoolFencer {
  return {
    competitor_id: id,
    position,
    first_name: id.toUpperCase(),
    last_name: "Fencer",
    team: `${id} club`,
    standing: {
      place: position,
      victories: position,
      matches: 3,
      victory_ratio: ratio,
      touches_scored: 10 + position,
      touches_received: 5 + position,
      indicator: 5,
    },
  };
}

function bout(c1: string, c2: string, s1: number, s2: number, winner: string | null): PoolBout {
  return {
    id: `${c1}-${c2}`,
    status: winner ? "end" : "active",
    competitor_1_id: c1,
    competitor_2_id: c2,
    competitor_1_score: s1,
    competitor_2_score: s2,
    winner_id: winner,
    location: null,
    start_time: null,
  };
}

const pool = (fencers: PoolFencer[], bouts: PoolBout[]): PoolBoard => ({
  id: "pool",
  pool_stage_id: "stage",
  number: 1,
  strip: "Strip 1",
  status: "active",
  start_time: null,
  started_at: null,
  completed_at: null,
  fencers,
  bouts,
});

describe("boutsTable", () => {
  it("orders headers and rows by position even when the fencers array is out of order", () => {
    const table = boutsTable(pool([fencer("c", 3), fencer("a", 1), fencer("b", 2)], []));

    expect(table.headers).toEqual(["1", "2", "3"]);
    expect(table.rows.map((row) => row.name)).toEqual(["A Fencer", "B Fencer", "C Fencer"]);
    expect(table.rows.map((row) => row.team)).toEqual(["a club", "b club", "c club"]);
  });

  it("marks the diagonal as self", () => {
    const table = boutsTable(pool([fencer("a", 1), fencer("b", 2)], []));

    expect(table.rows[0].cells[0]).toEqual({ kind: "self" });
    expect(table.rows[1].cells[1]).toEqual({ kind: "self" });
  });

  it.each([
    { case: "winner is competitor 1", bouts: [bout("a", "b", 5, 2, "a")], label: "V5" },
    { case: "winner is competitor 2", bouts: [bout("b", "a", 3, 5, "a")], label: "V5" },
    { case: "loser who was competitor 1", bouts: [bout("a", "b", 2, 5, "b")], label: "D2" },
    { case: "loser who was competitor 2", bouts: [bout("b", "a", 5, 4, "b")], label: "D4" },
    { case: "active bout without a winner", bouts: [bout("a", "b", 2, 1, null)], label: "" },
    { case: "no bout between the pair", bouts: [], label: "" },
  ])("gives the first fencer the cell '$label' for $case", ({ bouts, label }) => {
    const table = boutsTable(pool([fencer("a", 1), fencer("b", 2)], bouts));

    expect(table.rows[0].cells[1]).toEqual({ kind: "value", label });
  });

  it("mirrors the result in the opponent's row", () => {
    const table = boutsTable(pool([fencer("a", 1), fencer("b", 2)], [bout("a", "b", 5, 2, "a")]));

    expect(table.rows[1].cells[0]).toEqual({ kind: "value", label: "D2" });
  });
});

describe("standingsTable", () => {
  it("uses the standings column headers", () => {
    expect(standingsTable(pool([fencer("a", 1)], [])).headers).toEqual(["V", "V/M", "TS", "TR"]);
  });

  it.each([
    { ratio: 0.5, label: "0.50" },
    { ratio: 0, label: "0.00" },
  ])("formats a victory ratio of $ratio as $label", ({ ratio, label }) => {
    const table = standingsTable(pool([fencer("a", 1, ratio)], []));

    expect(table.rows[0].cells).toEqual(
      ["1", label, "11", "6"].map((value) => ({ kind: "value", label: value })),
    );
  });

  it("orders rows by position", () => {
    const table = standingsTable(pool([fencer("b", 2), fencer("a", 1)], []));

    expect(table.rows.map((row) => row.name)).toEqual(["A Fencer", "B Fencer"]);
  });
});
