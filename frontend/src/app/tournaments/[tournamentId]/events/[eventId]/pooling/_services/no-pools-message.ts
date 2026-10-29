import type { PoolFilters } from "../_types/pool-filters";

import { hasActiveFilters } from "./apply-pool-filters";

export function noPoolsMessage(search: string, filters: PoolFilters): string {
  const query = search.trim();
  const filtered = hasActiveFilters(filters);

  if (query && filtered) {
    return `No pools match "${query}" with these filters.`;
  }
  if (query) {
    return `No pools match "${query}".`;
  }
  return filtered ? "No pools match these filters." : "No pools yet.";
}
