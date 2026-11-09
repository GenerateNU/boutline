"use client";

import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/primitives/button";

import { useCollapsedPools } from "../_hooks/use-collapsed-pools";
import { usePoolFilters } from "../_hooks/use-pool-filters";
import { noPoolsMessage } from "../_services/no-pools-message";
import type { PoolBoard } from "../_types/pool-board";

import { PoolCard } from "./pool-card";
import { PoolSearch } from "./pool-search";

interface PoolListProps {
  pools: PoolBoard[];
  poolingPath: string;
}

export function PoolList({ pools, poolingPath }: PoolListProps) {
  const { search, setSearch, filters, setFilters, matches, poolNumbers } = usePoolFilters(pools);
  const { collapsedIds, setPoolOpen, setAllOpen } = useCollapsedPools();

  const allCollapsed = matches.length > 0 && matches.every((pool) => collapsedIds.has(pool.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <PoolSearch
          value={search}
          onChange={setSearch}
          filters={filters}
          poolNumbers={poolNumbers}
          onFiltersChange={setFilters}
        />
        {matches.length > 0 && (
          <Button
            type="button"
            variant="text"
            size="sm"
            onClick={() => setAllOpen(pools.map((pool) => pool.id), allCollapsed)}
            className="self-end"
          >
            {allCollapsed ? <ChevronsUpDown aria-hidden /> : <ChevronsDownUp aria-hidden />}
            {allCollapsed ? "Expand all" : "Collapse all"}
          </Button>
        )}
      </div>
      {matches.length > 0 ? (
        <ul aria-label="Pools" className="flex flex-col gap-6">
          {matches.map((pool) => (
            <li key={pool.id}>
              <PoolCard
                pool={pool}
                poolingPath={poolingPath}
                open={!collapsedIds.has(pool.id)}
                onOpenChange={(open) => setPoolOpen(pool.id, open)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-secondary">{noPoolsMessage(search, filters)}</p>
      )}
    </div>
  );
}
