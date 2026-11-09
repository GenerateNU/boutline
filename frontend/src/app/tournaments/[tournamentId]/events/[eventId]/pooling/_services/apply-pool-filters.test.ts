import type { PoolBoard, PoolStatus } from "../_types/pool-board";
import type { PoolFilters } from "../_types/pool-filters";

import { applyPoolFilters, defaultPoolFilters, hasActiveFilters } from "./apply-pool-filters";

function pool(
  number: number,
  strip: string,
  status: PoolStatus,
  start_time: string | null,
  fencers: [string, string, string][],
): PoolBoard {
  return {
    id: `pool-${number}`,
    pool_stage_id: "stage",
    number,
    strip,
    status,
    start_time,
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
  pool(1, "Strip 10", "active", "2026-10-24T09:00:00Z", [["Yan", "Wang", "New York Fencers Club"]]),
  pool(2, "Strip 9", "ended", null, [["Caitlin", "Lee", "Boston Fencing Club"]]),
  pool(3, "Strip 2", "upcoming", "2026-10-24T09:00:00Z", [
    ["Priya", "Patel", "Boston Fencing Club"],
    ["Zoe", "Kim", "Cambridge FC"],
  ]),
  pool(4, "Strip 1", "active", "2026-10-24T08:00:00Z", [["Noah", "Park", "Cambridge FC"]]),
];

function idsFor(filters: Partial<PoolFilters>): string[] {
  return applyPoolFilters(pools, { ...defaultPoolFilters, ...filters }).map((p) => p.id);
}

describe("applyPoolFilters", () => {
  it.each([
    { case: "no filters", filters: {}, ids: ["pool-1", "pool-2", "pool-3", "pool-4"] },
    { case: "a padded case-insensitive fencer", filters: { fencer: "  zoe KIM " }, ids: ["pool-3"] },
    { case: "a club", filters: { club: "boston" }, ids: ["pool-2", "pool-3"] },
    { case: "a status", filters: { status: "active" as const }, ids: ["pool-1", "pool-4"] },
    { case: "a pool number", filters: { poolNumber: 2 }, ids: ["pool-2"] },
    { case: "fencer and club matching different fencers", filters: { fencer: "priya", club: "cambridge" }, ids: ["pool-3"] },
    { case: "every narrowing filter", filters: { club: "cambridge", status: "active" as const, poolNumber: 4 }, ids: ["pool-4"] },
    { case: "filters that exclude each other", filters: { status: "ended" as const, poolNumber: 1 }, ids: [] },
  ])("returns $ids for $case", ({ filters, ids }) => {
    expect(idsFor(filters)).toEqual(ids);
  });

  it.each([
    { sort: "number" as const, ids: ["pool-1", "pool-2", "pool-3", "pool-4"] },
    { sort: "start_time" as const, ids: ["pool-4", "pool-1", "pool-3", "pool-2"] },
    { sort: "strip" as const, ids: ["pool-4", "pool-3", "pool-2", "pool-1"] },
  ])("sorts by $sort", ({ sort, ids }) => {
    expect(idsFor({ sort })).toEqual(ids);
  });

  it("does not mutate the input", () => {
    const before = pools.map((p) => p.id);

    applyPoolFilters(pools, { ...defaultPoolFilters, sort: "strip" });

    expect(pools.map((p) => p.id)).toEqual(before);
  });
});

describe("hasActiveFilters", () => {
  it.each([
    { case: "the defaults", filters: {}, expected: false },
    { case: "a whitespace-only fencer", filters: { fencer: "   " }, expected: false },
    { case: "only a sort", filters: { sort: "strip" as const }, expected: false },
    { case: "a fencer", filters: { fencer: "yan" }, expected: true },
    { case: "a club", filters: { club: "boston" }, expected: true },
    { case: "a status", filters: { status: "ended" as const }, expected: true },
    { case: "a pool number", filters: { poolNumber: 1 }, expected: true },
  ])("is $expected for $case", ({ filters, expected }) => {
    expect(hasActiveFilters({ ...defaultPoolFilters, ...filters })).toBe(expected);
  });
});
