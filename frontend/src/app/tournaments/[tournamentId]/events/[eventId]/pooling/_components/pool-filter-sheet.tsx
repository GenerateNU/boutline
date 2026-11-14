"use client";

import { useState } from "react";

import { Chip } from "@/components/primitives/chip";
import { ChipGroup, ChipGroupItem } from "@/components/primitives/chip-group";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";

import { defaultPoolFilters, hasActiveFilters } from "../_services/apply-pool-filters";
import { matchingSuggestions } from "../_services/pool-filter-options";
import { poolStatusLabels } from "../_services/pool-status-labels";
import type { PoolStatus } from "../_types/pool-board";
import type { PoolFilterOptions, PoolFilters, PoolSortKey } from "../_types/pool-filters";

interface PoolFilterSheetProps {
  filters: PoolFilters;
  options: PoolFilterOptions;
  onApply: (filters: PoolFilters) => void;
}

const STATUSES: PoolStatus[] = ["upcoming", "active", "ended"];

const SORTS: { value: PoolSortKey; label: string }[] = [
  { value: "number", label: "Pool Number" },
  { value: "start_time", label: "Start time" },
  { value: "strip", label: "Strip" },
];

export function PoolFilterSheet({ filters, options, onApply }: PoolFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const [fencerQuery, setFencerQuery] = useState("");
  const [clubQuery, setClubQuery] = useState("");
  const active = hasActiveFilters(filters);

  return (
    <FilterSheetDialog
      open={open}
      onOpenChange={(next) => {
        // Reopening starts from the applied filters, so closing without Show pools drops the draft.
        if (next) {
          setDraft(filters);
          setFencerQuery("");
          setClubQuery("");
        }
        setOpen(next);
      }}
      triggerLabel={active ? "Filter pools (filters applied)" : "Filter pools"}
      triggerActive={active}
      description="Narrow the pool list"
      submitLabel="Show pools"
      onReset={() => {
        setDraft(defaultPoolFilters);
        setFencerQuery("");
        setClubQuery("");
      }}
      onSubmit={() => {
        onApply(draft);
        setOpen(false);
      }}
    >
      {/* Picking a suggestion empties its search box, so the picks show here until submitted. */}
      {(draft.fencer || draft.club) && (
        <div className="flex flex-wrap gap-2">
          {draft.fencer && (
            <Chip onDismiss={() => setDraft({ ...draft, fencer: "" })} dismissLabel={`Remove ${draft.fencer}`}>
              {draft.fencer}
            </Chip>
          )}
          {draft.club && (
            <Chip onDismiss={() => setDraft({ ...draft, club: "" })} dismissLabel={`Remove ${draft.club}`}>
              {draft.club}
            </Chip>
          )}
        </div>
      )}

      <FilterSearchField
        label="Fencer"
        value={fencerQuery}
        onChange={(event) => setFencerQuery(event.target.value)}
        suggestions={matchingSuggestions(options.fencers, fencerQuery)}
        failed={false}
        selected={draft.fencer}
        onPick={(fencer) => {
          setDraft({ ...draft, fencer });
          setFencerQuery("");
        }}
        noun="fencers"
      />

      <FilterSearchField
        label="Club"
        value={clubQuery}
        onChange={(event) => setClubQuery(event.target.value)}
        suggestions={matchingSuggestions(options.clubs, clubQuery)}
        failed={false}
        selected={draft.club}
        onPick={(club) => {
          setDraft({ ...draft, club });
          setClubQuery("");
        }}
        noun="clubs"
      />

      <ChipGroup
        label="Pool Status"
        value={draft.status ?? "all"}
        // Radix reports "" when the chosen chip is clicked again; keep the current choice.
        onValueChange={(value) => value && setDraft({ ...draft, status: value === "all" ? null : (value as PoolStatus) })}
      >
        <ChipGroupItem value="all" className="flex-1">
          All
        </ChipGroupItem>
        {STATUSES.map((status) => (
          <ChipGroupItem key={status} value={status} className="flex-1">
            {poolStatusLabels[status]}
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
        {options.poolNumbers.map((number) => (
          <ChipGroupItem key={number} value={String(number)}>
            Pool {number}
          </ChipGroupItem>
        ))}
      </ChipGroup>

      <ChipGroup
        label="Sort by"
        value={draft.sort}
        onValueChange={(value) => value && setDraft({ ...draft, sort: value as PoolSortKey })}
      >
        {SORTS.map(({ value, label }) => (
          <ChipGroupItem key={value} value={value} className="flex-1">
            {label}
          </ChipGroupItem>
        ))}
      </ChipGroup>
    </FilterSheetDialog>
  );
}
