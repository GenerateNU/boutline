"use client";

import { usePoolFilters } from "../_hooks/use-pool-filters";
import { noPoolsMessage } from "../_services/no-pools-message";
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

  return (
    <div className="flex flex-col gap-6 font-manrope">
      <div className="flex gap-2">
        <PoolSearch value={search} onChange={setSearch} options={options} />
        <PoolFilterSheet filters={filters} options={options} onApply={setFilters} />
      </div>
      {matches.length > 0 ? (
        <ul aria-label="Pools" className="flex flex-col gap-6">
          {matches.map((pool) => (
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
