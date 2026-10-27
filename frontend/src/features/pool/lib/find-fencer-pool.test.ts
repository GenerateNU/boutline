import { findFencerPool } from "@/features/pool/lib/find-fencer-pool";
import type { Pool, PoolBout } from "@/features/pool/types/pool";

function pool(id: string, overrides: Partial<Pool> = {}): Pool {
  return {
    id,
    pool_stage_id: "s1",
    started_at: null,
    completed_at: null,
    created_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

function bout(
  poolId: string,
  left: string,
  right: string,
  overrides: Partial<PoolBout> = {},
): PoolBout {
  return {
    id: `${poolId}-${left}-${right}`,
    referee_id: null,
    competitor_1_id: left,
    competitor_2_id: right,
    points_to_win: 5,
    status: "upcoming",
    pool_id: poolId,
    location: "Strip 1",
    ...overrides,
  };
}

describe("findFencerPool", () => {
  const pools = [pool("p2"), pool("p1")];
  const boutsByPool = {
    p1: [bout("p1", "maya", "liam"), bout("p1", "priya", "diego")],
    p2: [
      bout("p2", "hana", "noah", { status: "ended", location: "Strip 3" }),
      bout("p2", "hana", "amara", { location: "Strip 12" }),
    ],
  };

  it.each([
    {
      name: "the first pool by id when timestamps tie",
      competitorId: "maya",
      want: { poolNumber: 1, strip: "1", status: "upcoming", fencerCount: 4 },
    },
    {
      name: "the strip of the fencer's next bout over a finished one",
      competitorId: "hana",
      want: { poolNumber: 2, strip: "12", status: "upcoming", fencerCount: 3 },
    },
    { name: "null for a fencer in no pool", competitorId: "ethan", want: null },
  ])("returns $name", ({ competitorId, want }) => {
    expect(findFencerPool(pools, boutsByPool, competitorId)).toEqual(want);
  });

  it.each([
    { name: "upcoming", overrides: {}, want: "upcoming" },
    { name: "in progress", overrides: { started_at: "2026-10-01T09:00:00Z" }, want: "in_progress" },
    {
      name: "finished",
      overrides: { started_at: "2026-10-01T09:00:00Z", completed_at: "2026-10-01T11:00:00Z" },
      want: "finished",
    },
  ])("reports a $name pool", ({ overrides, want }) => {
    const result = findFencerPool([pool("p1", overrides)], { p1: [bout("p1", "maya", "liam")] }, "maya");
    expect(result?.status).toBe(want);
  });

  it("leaves the strip empty when no bout has a location", () => {
    const result = findFencerPool(
      [pool("p1")],
      { p1: [bout("p1", "maya", "liam", { location: null })] },
      "maya",
    );
    expect(result?.strip).toBeNull();
  });
});
