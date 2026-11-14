import type { PoolBoard } from "../_types/pool-board";

import { poolTitle } from "./pool-title";

// Pinned pools lead, alphabetically by title with numbers compared as numbers ("Pool 2" before "Pool 10");
// the rest keep the order they came in, which is the chosen sort.
export function pinnedFirst(pools: PoolBoard[], pinnedIds: string[]): PoolBoard[] {
  const pinned = pools
    .filter((pool) => pinnedIds.includes(pool.id))
    .sort((a, b) => poolTitle(a).localeCompare(poolTitle(b), undefined, { numeric: true }));
  return [...pinned, ...pools.filter((pool) => !pinnedIds.includes(pool.id))];
}
