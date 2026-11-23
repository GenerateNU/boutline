"use client";

import { PinnedFirstList } from "@/features/pinning/components/pinned-first-list";
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

  return (
    <div className="flex flex-col gap-6 font-manrope">
      <div className="flex gap-2">
        <PoolSearch value={search} onChange={setSearch} options={options} />
        <PoolFilterSheet filters={filters} options={options} onApply={setFilters} />
      </div>
      {matches.length > 0 ? (
        <PinnedFirstList
          aria-label="Pools"
          className="flex flex-col gap-6"
          entries={matches.map((pool) => ({
            key: pool.id,
            label: poolTitle(pool),
            pin: { kind: "pool", item: { ...event, id: pool.id } },
            node: <PoolCard pool={pool} poolingPath={poolingPath} event={event} />,
          }))}
        />
      ) : (
        <p className="text-sm text-neutral-secondary">{noPoolsMessage(search, filters)}</p>
      )}
    </div>
  );
}
