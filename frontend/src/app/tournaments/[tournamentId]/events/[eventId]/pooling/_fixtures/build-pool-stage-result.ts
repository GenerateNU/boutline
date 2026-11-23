import type { PoolStageResult } from "../_types/pool-stage-result";

export function buildPoolStageResult(overrides: Partial<PoolStageResult>): PoolStageResult {
  return {
    competitor_id: "c1",
    first_name: "Maya",
    last_name: "Chen",
    club: "Boston Fencing Club",
    pool_number: 1,
    status: "pending",
    place: 1,
    victories: 3,
    matches: 3,
    victory_ratio: 1,
    touches_scored: 15,
    touches_received: 6,
    indicator: 9,
    ...overrides,
  };
}
