import type { PoolBoard, PoolBout, PoolFencer } from "../_types/pool-board";

import { poolBoutDetail } from "./pool-bout-detail";

function fencer(id: string, first: string, last: string, position: number): PoolFencer {
  return {
    competitor_id: id,
    position,
    first_name: first,
    last_name: last,
    team: `${first} Club`,
    standing: { place: 1, victories: 0, matches: 0, victory_ratio: 0, touches_scored: 0, touches_received: 0, indicator: 0 },
  };
}

function bout(id: string, overrides: Partial<PoolBout>): PoolBout {
  return {
    id,
    status: "end",
    competitor_1_id: "a",
    competitor_2_id: "b",
    competitor_1_score: 5,
    competitor_2_score: 2,
    winner_id: "a",
    location: "Strip 3",
    start_time: null,
    ...overrides,
  };
}

const pool: PoolBoard = {
  id: "pool",
  pool_stage_id: "stage",
  number: 7,
  strip: "Strip 9",
  status: "active",
  start_time: null,
  started_at: null,
  completed_at: null,
  fencers: [fencer("a", "Ann", "Xu", 1), fencer("b", "Ben", "Yu", 2)],
  bouts: [
    bout("first-wins", {}),
    bout("second-wins", { competitor_1_score: 2, competitor_2_score: 5, winner_id: "b" }),
    bout("active", { status: "active", competitor_1_score: 2, competitor_2_score: 1, winner_id: null }),
    bout("upcoming", { status: "upcoming", competitor_1_score: 0, competitor_2_score: 0, winner_id: null, location: null }),
    bout("stranger", { competitor_2_id: "missing" }),
  ],
};

describe("poolBoutDetail", () => {
  it.each([
    ["first-wins", "Ann Xu won 5-2", ["V", "D"], [5, 2]],
    ["second-wins", "Ben Yu won 5-2", ["D", "V"], [2, 5]],
    ["active", "In progress, 2-1", [null, null], [2, 1]],
    ["upcoming", "Not fenced yet", [null, null], [null, null]],
  ])("summarises %s", (boutId, summary, results, scores) => {
    const detail = poolBoutDetail(pool, boutId);

    expect(detail?.summary).toBe(summary);
    expect(detail?.sides.map((side) => side.result)).toEqual(results);
    expect(detail?.sides.map((side) => side.score)).toEqual(scores);
  });

  it("describes the bout's place in the pool", () => {
    expect(poolBoutDetail(pool, "second-wins")).toMatchObject({
      number: 2,
      total: 5,
      status: "end",
      poolNumber: 7,
      strip: "3",
      sides: [
        { competitorId: "a", name: "Ann Xu", team: "Ann Club" },
        { competitorId: "b", name: "Ben Yu", team: "Ben Club" },
      ],
    });
  });

  it("falls back to the pool strip when the bout has no location", () => {
    expect(poolBoutDetail(pool, "upcoming")?.strip).toBe("9");
  });

  it.each(["unknown", "stranger"])("returns null for %s", (boutId) => {
    expect(poolBoutDetail(pool, boutId)).toBeNull();
  });
});
