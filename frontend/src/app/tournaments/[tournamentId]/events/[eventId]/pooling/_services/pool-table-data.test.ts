import { PoolBoard, PoolBout, PoolFencer } from "../_types/pool-board";

import { boutsTable } from "./pool-table-data";

function fencer(id: string, position: number): PoolFencer {
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
      victory_ratio: 0,
      touches_scored: 10 + position,
      touches_received: 5 + position,
      indicator: 5,
    },
  };
}

function bout(c1: string, c2: string, s1: number, s2: number, winner: string | null): PoolBout {
  return {
    id: `${c1}-${c2}`,
    status: winner ? "ended" : "active",
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
    { case: "winner is competitor 1", bouts: [bout("a", "b", 5, 2, "a")], label: "V5", result: "V" },
    { case: "winner is competitor 2", bouts: [bout("b", "a", 3, 5, "a")], label: "V5", result: "V" },
    { case: "loser who was competitor 1", bouts: [bout("a", "b", 2, 5, "b")], label: "D2", result: "D" },
    { case: "loser who was competitor 2", bouts: [bout("b", "a", 5, 4, "b")], label: "D4", result: "D" },
    { case: "active bout without a winner", bouts: [bout("a", "b", 2, 1, null)], label: "", result: null },
    { case: "no bout between the pair", bouts: [], label: "", result: null },
  ])("gives the first fencer label '$label' and result $result for $case", ({ bouts, label, result }) => {
    const table = boutsTable(pool([fencer("a", 1), fencer("b", 2)], bouts));

    expect(table.rows[0].cells[1]).toMatchObject({ kind: "bout", label, result });
  });

  it.each([
    { case: "decided bout", bouts: [bout("a", "b", 5, 2, "a")], boutId: "a-b" },
    { case: "active bout", bouts: [bout("a", "b", 2, 1, null)], boutId: "a-b" },
    { case: "bout listed in the opposite order", bouts: [bout("b", "a", 1, 2, null)], boutId: "b-a" },
    { case: "no bout between the pair", bouts: [], boutId: null },
  ])("gives both mirrored cells the bout id for $case", ({ bouts, boutId }) => {
    const table = boutsTable(pool([fencer("a", 1), fencer("b", 2)], bouts));

    expect(table.rows[0].cells[1]).toMatchObject({ kind: "bout", boutId });
    expect(table.rows[1].cells[0]).toMatchObject({ kind: "bout", boutId });
  });

  it("mirrors the result in the opponent's row", () => {
    const table = boutsTable(pool([fencer("a", 1), fencer("b", 2)], [bout("a", "b", 5, 2, "a")]));

    expect(table.rows[1].cells[0]).toEqual({ kind: "bout", label: "D2", result: "D", boutId: "a-b" });
  });
});
