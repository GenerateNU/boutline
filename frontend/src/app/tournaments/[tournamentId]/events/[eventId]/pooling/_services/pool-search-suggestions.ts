import type { Suggestion } from "@/components/primitives/filter-search-field";

import type { PoolFilterOptions } from "../_types/pool-filters";

import { matchingSuggestions } from "./pool-filter-options";

// Enough to pick from on a phone without the list running under the keyboard.
const MAX_PER_GROUP = 5;

export interface PoolSearchSuggestions {
  fencers: Suggestion[];
  clubs: Suggestion[];
}

export function poolSearchSuggestions(options: PoolFilterOptions, query: string): PoolSearchSuggestions {
  return {
    fencers: (matchingSuggestions(options.fencers, query) ?? []).slice(0, MAX_PER_GROUP),
    clubs: (matchingSuggestions(options.clubs, query) ?? []).slice(0, MAX_PER_GROUP),
  };
}
