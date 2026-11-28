import { PoolBoard } from "@/features/pool/types/pool-board";

import { fencerName } from "@/features/pool/lib/fencer-name";
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
