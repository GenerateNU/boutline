"use client";

import { useState } from "react";

import { ChipGroup, ChipGroupItem } from "@/components/primitives/chip-group";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import { poolStatusLabels } from "@/features/pool/lib/pool-status-labels";
import type { PoolStatus } from "@/features/pool/types/pool-board";

interface BoutStatusFilterSheetProps {
  statuses: PoolStatus[];
  onApply: (statuses: PoolStatus[]) => void;
}

export function BoutStatusFilterSheet({ statuses, onApply }: BoutStatusFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(statuses);
  const active = statuses.length > 0;

  return (
    <FilterSheetDialog
      open={open}
      onOpenChange={(next) => {
        // Reopening starts from the applied filter, so closing without Show bouts drops the draft.
        if (next) {
          setDraft(statuses);
        }
        setOpen(next);
      }}
      triggerLabel={active ? "Filter bouts (filters applied)" : "Filter bouts"}
      triggerActive={active}
      description="Narrow the bout list"
      submitLabel="Show bouts"
      onReset={() => setDraft([])}
      onSubmit={() => {
        onApply(draft);
        setOpen(false);
      }}
    >
      <ChipGroup
        label="Bout Status"
        value={draft[0] ?? "all"}
        // Radix reports "" when the chosen chip is clicked again; keep the current choice.
        onValueChange={(value) => value && setDraft(value === "all" ? [] : [value as PoolStatus])}
      >
        <ChipGroupItem value="all" className="flex-1">
          All
        </ChipGroupItem>
        {Object.entries(poolStatusLabels).map(([value, label]) => (
          <ChipGroupItem key={value} value={value} className="flex-1">
            {label}
          </ChipGroupItem>
        ))}
      </ChipGroup>
    </FilterSheetDialog>
  );
}
