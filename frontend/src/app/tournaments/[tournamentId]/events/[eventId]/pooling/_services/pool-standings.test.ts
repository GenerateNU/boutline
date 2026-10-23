import type { PoolBoard, PoolFencer } from "../_types/pool-board";

import { poolStandings } from "./pool-standings";

function fencer(id: string, position: number, place: number, ratio = 0, indicator = 0): PoolFencer {
  return {
    competitor_id: id,
    position,
    first_name: id,
    last_name: "Test",
    team: "Club",
    standing: {
      place,
      victories: 0,
      matches: 0,
      victory_ratio: ratio,
      touches_scored: 0,
      touches_received: 0,
      indicator,
    },
  };
}

function poolOf(fencers: PoolFencer[]): PoolBoard {
  return {
    id: "pool-x",
    pool_stage_id: "stage",
    number: 1,
    strip: "Strip 1",
    status: "active",
    start_time: null,
    started_at: null,
    completed_at: null,
    fencers,
    bouts: [],
  };
}

describe("poolStandings", () => {
  it("sorts by place and breaks ties by position", () => {
    const rows = poolStandings(
      poolOf([fencer("c", 3, 2), fencer("a", 2, 1), fencer("b", 1, 2), fencer("d", 4, 3)]),
    );

    expect(rows.map((row) => row.competitorId)).toEqual(["a", "b", "c", "d"]);
  });

  it.each([
    { indicator: 4, expected: "+4" },
    { indicator: -5, expected: "-5" },
    { indicator: 0, expected: "0" },
  ])("formats an indicator of $indicator as $expected", ({ indicator, expected }) => {
    expect(poolStandings(poolOf([fencer("a", 1, 1, 0, indicator)]))[0].indicator).toBe(expected);
  });

  it.each([
    { ratio: 1, expected: "1.00" },
    { ratio: 0.5, expected: "0.50" },
  ])("formats a ratio of $ratio as $expected", ({ ratio, expected }) => {
    expect(poolStandings(poolOf([fencer("a", 1, 1, ratio)]))[0].victoryRatio).toBe(expected);
  });
});
