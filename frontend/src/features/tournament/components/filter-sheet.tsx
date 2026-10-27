"use client";

import { ChevronDown, Funnel } from "lucide-react";
import { useState } from "react";

import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import {
  SegmentedButton,
  SegmentedButtonItem,
} from "@/components/primitives/segmented-button";
import { statusLabels } from "@/features/tournament/components/tournament-status-badge";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import type { TournamentStatus } from "@/features/tournament/types/tournament";

const distances = ["10 miles", "25 miles", "50 miles", "100 miles"];
const statusOrder: TournamentStatus[] = ["ended", "active", "pending"];

const chipClassName =
  "flex-none rounded-sm border border-brand px-3.5 py-1.5 text-brand first:border-l data-[state=on]:bg-brand data-[state=on]:text-background";

function FilterSheet() {
  const { searchParams, setFilters } = useTournamentFilters();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [distance, setDistance] = useState("");

  return (
    <FilterSheetDialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setStatus(searchParams.get("status") ?? "");
        }
        setOpen(next);
      }}
      triggerLabel="Filter tournaments"
      triggerIcon={
        <>
          <Funnel className="size-5! text-brand" />
          <ChevronDown />
        </>
      }
      description="Narrow the tournament list"
      submitLabel="Show Tournaments"
      onReset={() => {
        setStatus("");
        setDistance("");
      }}
      onSubmit={() => {
        setFilters({ status });
        setOpen(false);
      }}
    >
      <FilterSearchField label="Club" />
      <FilterSearchField label="Country" />

      <ChipGroup label="Distance" value={distance} onValueChange={setDistance}>
        {distances.map((value) => (
          <SegmentedButtonItem key={value} value={value} className={chipClassName}>
            {value}
          </SegmentedButtonItem>
        ))}
      </ChipGroup>

      <ChipGroup label="Status" value={status} onValueChange={setStatus}>
        {statusOrder.map((value) => (
          <SegmentedButtonItem key={value} value={value} className={chipClassName}>
            {statusLabels[value]}
          </SegmentedButtonItem>
        ))}
      </ChipGroup>
    </FilterSheetDialog>
  );
}

interface ChipGroupProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

function ChipGroup({ label, value, onValueChange, children }: ChipGroupProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-bold">{label}</p>
      <SegmentedButton
        type="single"
        aria-label={label}
        value={value}
        onValueChange={onValueChange}
        className="flex flex-wrap gap-2 overflow-visible rounded-none border-0"
      >
        {children}
      </SegmentedButton>
    </div>
  );
}

export { FilterSheet };
