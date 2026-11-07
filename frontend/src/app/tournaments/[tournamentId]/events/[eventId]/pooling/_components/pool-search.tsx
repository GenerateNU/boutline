import type { PoolFilters } from "../_types/pool-filters";

import { PoolFilterSheet } from "./pool-filter-sheet";
import { SearchField } from "./search-field";

interface PoolSearchProps {
  value: string;
  onChange: (value: string) => void;
  filters: PoolFilters;
  poolNumbers: number[];
  onFiltersChange: (filters: PoolFilters) => void;
}

export function PoolSearch({ value, onChange, filters, poolNumbers, onFiltersChange }: PoolSearchProps) {
  return (
    <div className="flex gap-2">
      <div role="search" className="flex-1">
        <SearchField
          aria-label="Search pools"
          placeholder="Enter search text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <PoolFilterSheet filters={filters} poolNumbers={poolNumbers} onApply={onFiltersChange} />
    </div>
  );
}
