"use client";

import { useState } from "react";

import { Chip } from "@/components/primitives/chip";
import { ChipGroup, ChipGroupItem, ChipGroupOptions } from "@/components/primitives/chip-group";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import { SelectField } from "@/components/primitives/select-field";
import { Text } from "@/components/primitives/text";
import {
  GENDER_OPTIONS,
  RATING_OPTIONS,
  optionLabel,
} from "@/features/competitor/lib/fencer-filters";
import { AGE_OPTIONS, WEAPON_OPTIONS } from "@/features/event/lib/event-filters";
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
  const [gender, setGender] = useState("");

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
          setGender(searchParams.get("gender") ?? "");
        }
        setOpen(next);
      }}
      triggerLabel="Filter fencers"
      description="Narrow the fencer list"
      submitLabel="Show Fencers"
      onReset={() => {
        clubField.reset();
        setRating("");
        setGender("");
      }}
      onSubmit={() => {
        setFilters({ team: clubField.submitValue(), rating, gender });
        setOpen(false);
      }}
    >
      {(clubField.value || rating || gender) && (
        <div className="flex flex-wrap gap-2">
          {clubField.value && (
            <Chip
              onDismiss={() => clubField.reset()}
              dismissLabel={`Remove Club: ${clubField.value}`}
            >
              Club: {clubField.value}
            </Chip>
          )}
          {rating && (
            <Chip
              onDismiss={() => setRating("")}
              dismissLabel={`Remove Rating: ${optionLabel(RATING_OPTIONS, rating)}`}
            >
              Rating: {optionLabel(RATING_OPTIONS, rating)}
            </Chip>
          )}
          {gender && (
            <Chip
              onDismiss={() => setGender("")}
              dismissLabel={`Remove Gender: ${optionLabel(GENDER_OPTIONS, gender)}`}
            >
              Gender: {optionLabel(GENDER_OPTIONS, gender)}
            </Chip>
          )}
        </div>
      )}

      <Text variant="caption">Greyed-out filters are coming soon.</Text>

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

      {/* Weapon and age live on events, which the fencer list can't filter by yet. */}
      <ChipGroup label="Weapon" disabled>
        <ChipGroupOptions options={WEAPON_OPTIONS} />
      </ChipGroup>

      <SelectField label="Age Category" placeholder="Select age" options={AGE_OPTIONS} disabled />

      <SelectField
        label="Rating"
        name="rating"
        placeholder="Select rating"
        options={RATING_OPTIONS}
        value={rating}
        onValueChange={setRating}
      />

      <ChipGroup label="Gender" value={gender} onValueChange={setGender}>
        {GENDER_OPTIONS.map(({ value, label }) => (
          <ChipGroupItem key={value} value={value} className="flex-1">
            {label}
          </ChipGroupItem>
        ))}
      </ChipGroup>
    </FilterSheetDialog>
  );
}

export { FencerFilterSheet };
