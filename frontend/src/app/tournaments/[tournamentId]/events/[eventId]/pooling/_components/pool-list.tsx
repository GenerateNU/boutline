"use client";

import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/primitives/button";

import { useCollapsedPools } from "../_hooks/use-collapsed-pools";
import { usePinnedPools } from "../_hooks/use-pinned-pools";
import { usePoolFilters } from "../_hooks/use-pool-filters";
import { noPoolsMessage } from "../_services/no-pools-message";
import type { PoolBoard } from "../_types/pool-board";

import { PoolSearch } from "./pool-search";
import { PoolSection } from "./pool-section";

interface PoolListProps {
  pools: PoolBoard[];
  poolingPath: string;
  eventId: string;
}

export function PoolList({ pools, poolingPath, eventId }: PoolListProps) {
  const { search, setSearch, filters, setFilters, matches, poolNumbers } = usePoolFilters(pools);
  const { pinnedIds } = usePinnedPools(eventId);
  const { collapsedIds, setPoolOpen, setAllOpen } = useCollapsedPools();

  const pinned = matches.filter((pool) => pinnedIds.has(pool.id));
  const allCollapsed = matches.length > 0 && matches.every((pool) => collapsedIds.has(pool.id));
  const sectionProps = { poolingPath, collapsedIds, onPoolOpenChange: setPoolOpen };

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
            onClick={() => setAllOpen(pools.map((pool) => pool.id), allCollapsed)}
            className="h-8 self-end px-2 text-brand"
          >
            {allCollapsed ? <ChevronsUpDown aria-hidden /> : <ChevronsDownUp aria-hidden />}
            {allCollapsed ? "Expand all" : "Collapse all"}
          </Button>
        )}
      </div>
      {pinned.length > 0 && <PoolSection title="Pinned" pools={pinned} {...sectionProps} />}
      <PoolSection
        title="All Pools"
        pools={matches}
        {...sectionProps}
        emptyMessage={noPoolsMessage(search, filters)}
      />
    </div>
  );
}
