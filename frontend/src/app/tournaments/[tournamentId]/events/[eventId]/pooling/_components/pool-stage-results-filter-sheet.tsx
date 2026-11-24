"use client";

import { useState } from "react";

import { ChipGroup, ChipGroupItem } from "@/components/primitives/chip-group";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";

import { NO_POOL_STAGE_RESULT_FILTERS } from "../_services/filter-pool-stage-results";
import { POOL_STAGE_RESULT_STATUSES } from "../_services/pool-stage-result-statuses";
import type {
  PoolStageResult,
  PoolStageResultFilters,
  PoolStageResultStatus,
} from "../_types/pool-stage-result";

interface PoolStageResultsFilterSheetProps {
  results: PoolStageResult[];
  filters: PoolStageResultFilters;
  onApply: (filters: PoolStageResultFilters) => void;
}

const STATUSES = Object.keys(POOL_STAGE_RESULT_STATUSES) as PoolStageResultStatus[];

export function PoolStageResultsFilterSheet({ results, filters, onApply }: PoolStageResultsFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const active = filters.status !== null || filters.poolNumber !== null;
  const statuses = STATUSES.filter((status) => results.some((result) => result.status === status));
  const poolNumbers = [...new Set(results.map((result) => result.pool_number))].sort((a, b) => a - b);

  return (
    <FilterSheetDialog
      open={open}
      onOpenChange={(next) => {
        // Reopening starts from the applied filters, so closing without Show results drops the draft.
        if (next) {
          setDraft(filters);
        }
        setOpen(next);
      }}
      triggerLabel={active ? "Filter pool results (filters applied)" : "Filter pool results"}
      triggerActive={active}
      description="Narrow the pool results"
      submitLabel="Show results"
      onReset={() => setDraft(NO_POOL_STAGE_RESULT_FILTERS)}
      onSubmit={() => {
        onApply(draft);
        setOpen(false);
      }}
    >
      <ChipGroup
        label="Status"
        value={draft.status ?? "all"}
        // Radix reports "" when the chosen chip is clicked again; keep the current choice.
        onValueChange={(value) =>
          value && setDraft({ ...draft, status: value === "all" ? null : (value as PoolStageResultStatus) })
        }
      >
        <ChipGroupItem value="all" className="flex-1">
          All
        </ChipGroupItem>
        {statuses.map((status) => (
          <ChipGroupItem key={status} value={status} className="flex-1">
            {POOL_STAGE_RESULT_STATUSES[status].label}
          </ChipGroupItem>
        ))}
      </ChipGroup>

      <ChipGroup
        label="Pool Number"
        value={draft.poolNumber === null ? "all" : String(draft.poolNumber)}
        onValueChange={(value) => value && setDraft({ ...draft, poolNumber: value === "all" ? null : Number(value) })}
        className="flex-wrap"
      >
        <ChipGroupItem value="all">All</ChipGroupItem>
        {poolNumbers.map((number) => (
          <ChipGroupItem key={number} value={String(number)}>
            Pool {number}
          </ChipGroupItem>
        ))}
      </ChipGroup>
    </FilterSheetDialog>
  );
}
