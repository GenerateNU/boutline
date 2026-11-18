"use client";

import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";

import { usePoolFilters } from "../_hooks/use-pool-filters";
import { noPoolsMessage } from "../_services/no-pools-message";
import { pinnedFirst } from "../_services/pinned-first";
import type { PoolBoard } from "../_types/pool-board";

import { PoolCard } from "./pool-card";
import { PoolFilterSheet } from "./pool-filter-sheet";
import { PoolSearch } from "./pool-search";

interface PoolListProps {
  pools: PoolBoard[];
  poolingPath: string;
}

export function PoolList({ pools, poolingPath }: PoolListProps) {
  const { search, setSearch, filters, setFilters, matches, options } = usePoolFilters(pools);
  const { pinned } = usePinnedItems();
  const ordered = pinnedFirst(matches, pinned.poolIds);

  return (
    <div className="flex flex-col gap-6 font-manrope">
      <div className="flex max-w-mobile gap-2">
        <PoolSearch value={search} onChange={setSearch} options={options} />
        <PoolFilterSheet filters={filters} options={options} onApply={setFilters} />
      </div>
      {ordered.length > 0 ? (
        <ul aria-label="Pools" className="flex flex-col gap-6 lg:grid lg:grid-cols-[repeat(auto-fill,24rem)]">
          {ordered.map((pool) => (
            <li key={pool.id}>
              <PoolCard pool={pool} poolingPath={poolingPath} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-secondary">{noPoolsMessage(search, filters)}</p>
      )}
    </div>
  );
}
