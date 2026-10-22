"use client";

import { useState } from "react";

import { usePinnedPools } from "../_hooks/use-pinned-pools";
import { filterPools } from "../_services/filter-pools";
import type { PoolBoard } from "../_types/pool-board";

import { PoolSearch } from "./pool-search";
import { PoolSection } from "./pool-section";

interface PoolListProps {
  pools: PoolBoard[];
  poolingPath: string;
}

export function PoolList({ pools, poolingPath }: PoolListProps) {
  const [search, setSearch] = useState("");
  const { pinnedIds } = usePinnedPools();

  const matches = filterPools(pools, search);
  const pinned = matches.filter((pool) => pinnedIds.has(pool.id));
  const query = search.trim();

  return (
    <div className="flex flex-col gap-6">
      <PoolSearch value={search} onChange={setSearch} />
      {pinned.length > 0 && <PoolSection title="Pinned" pools={pinned} poolingPath={poolingPath} />}
      <PoolSection
        title="All Pools"
        pools={matches}
        poolingPath={poolingPath}
        emptyMessage={query ? `No pools match "${query}".` : "No pools yet."}
      />
    </div>
  );
}
