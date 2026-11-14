import { PoolBoard } from "../_types/pool-board";

import { fencerName } from "./fencer-name";
import { poolTitle } from "./pool-title";

export function filterPools(pools: PoolBoard[], search: string): PoolBoard[] {
  const query = search.trim().toLowerCase();
  if (query === "") {
    return pools;
  }
  return pools.filter((pool) =>
    [poolTitle(pool), ...pool.fencers.flatMap((fencer) => [fencerName(fencer), fencer.team])].some((text) =>
      text.toLowerCase().includes(query),
    ),
  );
}
