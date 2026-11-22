import type { Suggestion } from "@/components/primitives/filter-search-field";

import type { PoolFilterOptions } from "../_types/pool-filters";

import { matchingSuggestions } from "./pool-filter-options";

// Enough to pick from on a phone without the list running under the keyboard.
const MAX_PER_GROUP = 5;

export interface PoolSearchSuggestions {
  fencers: Suggestion[];
  clubs: Suggestion[];
}

function groupSuggestions(names: string[], query: string): Suggestion[] {
  // An empty field lists the first names so focusing it shows what can be searched.
  const matches = matchingSuggestions(names, query) ?? names.map((name) => ({ value: name, label: name }));
  return matches.slice(0, MAX_PER_GROUP);
}

export function poolSearchSuggestions(options: PoolFilterOptions, query: string): PoolSearchSuggestions {
  return {
    fencers: groupSuggestions(options.fencers, query),
    clubs: groupSuggestions(options.clubs, query),
  };
}
