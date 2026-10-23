import { useState } from "react";

import { applyPoolFilters, defaultPoolFilters } from "../_services/apply-pool-filters";
import { filterPools } from "../_services/filter-pools";
import type { PoolBoard } from "../_types/pool-board";
import type { PoolFilters } from "../_types/pool-filters";

export function usePoolFilters(pools: PoolBoard[]) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<PoolFilters>(defaultPoolFilters);

  const matches = applyPoolFilters(filterPools(pools, search), filters);
  const poolNumbers = pools.map((pool) => pool.number).sort((a, b) => a - b);

  return { search, setSearch, filters, setFilters, matches, poolNumbers };
}
