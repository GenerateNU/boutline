import type { Suggestion } from "@/components/primitives/filter-search-field";

import type { PoolBoard } from "../_types/pool-board";
import type { PoolFilterOptions } from "../_types/pool-filters";

import { fencerName } from "./fencer-name";

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function poolFilterOptions(pools: PoolBoard[]): PoolFilterOptions {
  const fencers = pools.flatMap((pool) => pool.fencers);
  return {
    fencers: sortedUnique(fencers.map(fencerName)),
    clubs: sortedUnique(fencers.map((fencer) => fencer.team)),
    poolNumbers: pools.map((pool) => pool.number).sort((a, b) => a - b),
  };
}

// FilterSearchField shows nothing for null, so suggestions only appear once something is typed.
export function matchingSuggestions(options: string[], query: string): Suggestion[] | null {
  const term = query.trim().toLowerCase();
  if (term === "") {
    return null;
  }
  return options
    .filter((option) => option.toLowerCase().includes(term))
    .map((option) => ({ value: option, label: option }));
}
