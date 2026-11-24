"use client";

import { useState } from "react";

import { SearchBar } from "@/components/primitives/search-bar";

import { filterPoolStageResults, NO_POOL_STAGE_RESULT_FILTERS } from "../_services/filter-pool-stage-results";
import type { PoolStageResult } from "../_types/pool-stage-result";

import { PoolStageResultsFilterSheet } from "./pool-stage-results-filter-sheet";
import { PoolStageResultsTable } from "./pool-stage-results-table";

export function PoolStageResults({ results }: { results: PoolStageResult[] }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(NO_POOL_STAGE_RESULT_FILTERS);
  const matches = filterPoolStageResults(results, search, filters);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <SearchBar
          type="search"
          aria-label="Search pool results"
          placeholder="Search pool results"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="flex-1"
        />
        <PoolStageResultsFilterSheet results={results} filters={filters} onApply={setFilters} />
      </div>
      {matches.length > 0 ? (
        <PoolStageResultsTable results={matches} />
      ) : (
        <p className="text-sm text-neutral-secondary">
          {results.length > 0 ? "No fencers match your search or filters." : "No pool results yet."}
        </p>
      )}
    </div>
  );
}
