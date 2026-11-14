"use client";

import { useState } from "react";

import { SearchBar } from "@/components/primitives/search-bar";

import { filterPools } from "../_services/filter-pools";
import { noPoolsMessage } from "../_services/no-pools-message";
import type { PoolBoard } from "../_types/pool-board";

import { PoolCard } from "./pool-card";

interface PoolListProps {
  pools: PoolBoard[];
  poolingPath: string;
}

export function PoolList({ pools, poolingPath }: PoolListProps) {
  const [search, setSearch] = useState("");
  const matches = filterPools(pools, search);

  return (
    <div className="flex flex-col gap-6 font-manrope">
      <SearchBar
        type="search"
        aria-label="Search pools"
        placeholder="Search pools"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {matches.length > 0 ? (
        <ul aria-label="Pools" className="flex flex-col gap-6">
          {matches.map((pool) => (
            <li key={pool.id}>
              <PoolCard pool={pool} poolingPath={poolingPath} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-secondary">{noPoolsMessage(search)}</p>
      )}
    </div>
  );
}
