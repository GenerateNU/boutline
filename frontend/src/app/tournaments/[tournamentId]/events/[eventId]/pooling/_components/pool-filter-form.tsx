import { Dialog } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/primitives/button";

import { defaultPoolFilters } from "../_services/apply-pool-filters";
import { poolStatusLabels } from "../_services/pool-status-labels";
import type { PoolStatus } from "../_types/pool-board";
import type { PoolFilters, PoolSortKey } from "../_types/pool-filters";

import { FilterChipGroup } from "./filter-chip-group";
import { SearchField } from "./search-field";

interface PoolFilterFormProps {
  initial: PoolFilters;
  poolNumbers: number[];
  onApply: (filters: PoolFilters) => void;
}

const statusOptions: { value: "all" | PoolStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upcoming", label: poolStatusLabels.upcoming },
  { value: "active", label: poolStatusLabels.active },
  { value: "ended", label: poolStatusLabels.ended },
];

const sortOptions: { value: PoolSortKey; label: string }[] = [
  { value: "number", label: "Pool number" },
  { value: "start_time", label: "Start time" },
  { value: "strip", label: "Strip" },
];

export function PoolFilterForm({ initial, poolNumbers, onApply }: PoolFilterFormProps) {
  const [draft, setDraft] = useState(initial);
  const poolNumberOptions = [
    { value: "all", label: "All pools" },
    ...poolNumbers.map((number) => ({ value: String(number), label: `Pool ${number}` })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-bold">Fencer</span>
        <SearchField
          placeholder="Search fencer name"
          value={draft.fencer}
          onChange={(event) => setDraft({ ...draft, fencer: event.target.value })}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-bold">Club</span>
        <SearchField
          placeholder="Search club"
          value={draft.club}
          onChange={(event) => setDraft({ ...draft, club: event.target.value })}
        />
      </label>
      <FilterChipGroup
        label="Pool Status"
        options={statusOptions}
        value={draft.status ?? "all"}
        onValueChange={(value) => setDraft({ ...draft, status: value === "all" ? null : value })}
      />
      <FilterChipGroup
        label="Pool Number"
        options={poolNumberOptions}
        value={draft.poolNumber === null ? "all" : String(draft.poolNumber)}
        onValueChange={(value) => setDraft({ ...draft, poolNumber: value === "all" ? null : Number(value) })}
      />
      <FilterChipGroup
        label="Sort by"
        options={sortOptions}
        value={draft.sort}
        onValueChange={(sort) => setDraft({ ...draft, sort })}
      />
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setDraft(defaultPoolFilters)}
          className="cursor-pointer text-sm font-bold underline"
        >
          Clear all
        </button>
        <Dialog.Close asChild>
          <Button
            type="button"
            onClick={() => onApply(draft)}
            className="h-10 flex-1 rounded-sm bg-brand text-primary-foreground hover:bg-brand/90"
          >
            Show pools
          </Button>
        </Dialog.Close>
      </div>
    </div>
  );
}
