"use client";

import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";
import { pinnedFirst } from "@/features/pinning/services/pinned-first";
import type { PinnedEvent } from "@/features/pinning/types/pinning";

import { usePoolFilters } from "../_hooks/use-pool-filters";
import { noPoolsMessage } from "../_services/no-pools-message";
import { poolTitle } from "../_services/pool-title";
import type { PoolBoard } from "../_types/pool-board";

import { PoolCard } from "./pool-card";
import { PoolFilterSheet } from "./pool-filter-sheet";
import { PoolSearch } from "./pool-search";

interface PoolListProps {
  pools: PoolBoard[];
  poolingPath: string;
  event: PinnedEvent;
}

export function PoolList({ pools, poolingPath, event }: PoolListProps) {
  const { search, setSearch, filters, setFilters, matches, options } = usePoolFilters(pools);
  const { pinned } = usePinnedItems();
  const pinnedIds = new Set(pinned.pools.map((pool) => pool.id));
  const ordered = pinnedFirst(matches, (pool) => pinnedIds.has(pool.id), poolTitle);

  return (
    <div className="flex flex-col gap-6 font-manrope">
      <div className="flex gap-2">
        <PoolSearch value={search} onChange={setSearch} options={options} />
        <PoolFilterSheet filters={filters} options={options} onApply={setFilters} />
      </div>
      {ordered.length > 0 ? (
        <ul aria-label="Pools" className="flex flex-col gap-6">
          {ordered.map((pool) => (
            <li key={pool.id}>
              <PoolCard pool={pool} poolingPath={poolingPath} event={event} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-secondary">{noPoolsMessage(search, filters)}</p>
      )}
    </div>
  );
}
