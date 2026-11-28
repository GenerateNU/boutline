import type { PoolBoard, PoolBout, PoolFencer } from "@/features/pool/types/pool-board";

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

function bout(id: string, slot: number, overrides: Partial<PoolBout>): PoolBout {
  return {
    id,
    slot,
    status: "ended",
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
    bout("first-wins", 1, {}),
    bout("second-wins", 2, { competitor_1_score: 2, competitor_2_score: 5, winner_id: "b" }),
    bout("active", 3, { status: "active", competitor_1_score: 2, competitor_2_score: 1, winner_id: null }),
    bout("upcoming", 4, { status: "upcoming", competitor_1_score: 0, competitor_2_score: 0, winner_id: null, location: null }),
    bout("stranger", 5, { competitor_2_id: "missing" }),
  ],
};

describe("poolBoutDetail", () => {
  it.each([
    ["first-wins", ["V", "D"], [5, 2]],
    ["second-wins", ["D", "V"], [2, 5]],
    ["active", [null, null], [2, 1]],
    ["upcoming", [null, null], [null, null]],
  ])("resolves results and scores for %s", (boutId, results, scores) => {
    const detail = poolBoutDetail(pool, boutId);

    expect(detail?.sides.map((side) => side.result)).toEqual(results);
    expect(detail?.sides.map((side) => side.score)).toEqual(scores);
  });

  it("describes the bout's place in the pool", () => {
    expect(poolBoutDetail(pool, "second-wins")).toMatchObject({
      number: 2,
      total: 5,
      status: "ended",
      poolNumber: 7,
      strip: "3",
      sides: [
        { competitorId: "a", name: "Ann Xu", team: "Ann Club", position: 1 },
        { competitorId: "b", name: "Ben Yu", team: "Ben Club", position: 2 },
      ],
    });
  });

  it.each([
    { case: "the bout's location", poolStrip: "Strip 9", boutId: "second-wins", expected: "3" },
    { case: "the pool strip when the bout has no location", poolStrip: "Strip 9", boutId: "upcoming", expected: "9" },
    { case: "no strip when neither has one", poolStrip: null, boutId: "upcoming", expected: null },
  ])("uses $case", ({ poolStrip, boutId, expected }) => {
    expect(poolBoutDetail({ ...pool, strip: poolStrip }, boutId)?.strip).toBe(expected);
  });

  it.each(["unknown", "stranger"])("returns null for %s", (boutId) => {
    expect(poolBoutDetail(pool, boutId)).toBeNull();
  });
});
