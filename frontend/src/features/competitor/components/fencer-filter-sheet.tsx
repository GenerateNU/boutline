"use client";

import { useState } from "react";

import { Chip } from "@/components/primitives/chip";
import { ChipGroup } from "@/components/primitives/chip-group";
import { ComingSoonNote } from "@/components/primitives/coming-soon-note";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import { SelectField } from "@/components/primitives/select-field";
import {
  AGE_OPTIONS,
  GENDER_OPTIONS,
  WEAPON_OPTIONS,
} from "@/features/competitor/lib/placeholder-filter-options";
import { RATING_CATEGORIES } from "@/features/competitor/lib/rating-categories";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { useFilterSearch } from "@/lib/hooks/use-filter-search";
import { apiRequest } from "@/services/api-request";
import type { TeamListResult } from "@/types/competitor";

const SUGGESTION_LIMIT = 10;

interface FencerFilterSheetProps {
  tournamentId: string;
}

function FencerFilterSheet({ tournamentId }: FencerFilterSheetProps) {
  const { searchParams, setFilters } = useTournamentFilters();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState("");

  const clubField = useFilterSearch(async (term) => {
    const query = new URLSearchParams({ limit: String(SUGGESTION_LIMIT), q: term });
    const result = await apiRequest<TeamListResult>(
      `/tournaments/${encodeURIComponent(tournamentId)}/teams?${query}`,
    );
    return result.data.map(({ name }) => ({ value: name, label: name }));
  });

  return (
    <FilterSheetDialog
      open={open}
      onOpenChange={(next) => {
        // Each open starts from the filters in the URL, so closing without
        // "Show Fencers" throws the unsaved picks away.
        if (next) {
          clubField.reset(searchParams.get("team") ?? "");
          setRating(searchParams.get("rating") ?? "");
        }
        setOpen(next);
      }}
      triggerLabel="Filter fencers"
      description="Narrow the fencer list"
      submitLabel="Show Fencers"
      onReset={() => {
        clubField.reset();
        setRating("");
      }}
      onSubmit={() => {
        setFilters({ team: clubField.submitValue(), rating });
        setOpen(false);
      }}
    >
      <ComingSoonNote />

      {clubField.value && (
        <div className="flex flex-wrap gap-2">
          <Chip onDismiss={() => clubField.reset()} dismissLabel={`Remove ${clubField.value}`}>
            {clubField.value}
          </Chip>
        </div>
      )}

      <FilterSearchField
        label="Club"
        value={clubField.query}
        onChange={(event) => clubField.change(event.target.value)}
        suggestions={clubField.suggestions}
        failed={clubField.failed}
        loading={clubField.loading}
        selected={clubField.value}
        onPick={clubField.pick}
        onCommitText={clubField.commitText}
        maxLength={120}
        noun="clubs"
      />

      <ChipGroup label="Weapon" options={WEAPON_OPTIONS} disabled />

      <SelectField label="Age Category" placeholder="Any age category" options={AGE_OPTIONS} disabled />

      <SelectField
        label="Rating Category"
        placeholder="Any rating"
        options={RATING_CATEGORIES}
        value={rating}
        onValueChange={setRating}
      />

      <ChipGroup label="Gender" options={GENDER_OPTIONS} disabled />
    </FilterSheetDialog>
  );
}

export { FencerFilterSheet };
