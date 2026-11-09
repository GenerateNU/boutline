import { PoolBoard } from "../_types/pool-board";

import { filterPools } from "./filter-pools";

function pool(number: number, strip: string, fencers: [string, string, string][]): PoolBoard {
  return {
    id: `pool-${number}`,
    pool_stage_id: "stage",
    number,
    strip,
    status: "active",
    start_time: null,
    started_at: null,
    completed_at: null,
    fencers: fencers.map(([first_name, last_name, team], index) => ({
      competitor_id: `${first_name}-${last_name}`,
      position: index + 1,
      first_name,
      last_name,
      team,
      standing: {
        place: 1,
        victories: 0,
        matches: 0,
        victory_ratio: 0,
        touches_scored: 0,
        touches_received: 0,
        indicator: 0,
      },
    })),
    bouts: [],
  };
}

const pools = [
  pool(1, "Strip 3", [["Yan", "Wang", "New York Fencers Club"], ["Caitlin", "Lee", "Boston Fencing Club"]]),
  pool(2, "Strip 4", [["Priya", "Patel", "Cambridge FC"]]),
];

describe("filterPools", () => {
  it.each([
    { case: "an empty query", query: "", ids: ["pool-1", "pool-2"] },
    { case: "a whitespace query", query: "   ", ids: ["pool-1", "pool-2"] },
    { case: "a title match", query: "strip 4", ids: ["pool-2"] },
    { case: "a case-insensitive full name", query: "CAITLIN LEE", ids: ["pool-1"] },
    { case: "a team match", query: "cambridge", ids: ["pool-2"] },
    { case: "a padded query", query: "  wang ", ids: ["pool-1"] },
    { case: "no match", query: "zzz", ids: [] },
  ])("returns $ids for $case", ({ query, ids }) => {
    expect(filterPools(pools, query).map((p) => p.id)).toEqual(ids);
  });

  it("returns a matching pool whole", () => {
    expect(filterPools(pools, "yan")[0].fencers).toHaveLength(2);
  });
});
