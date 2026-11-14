"use client";

import { useState } from "react";

import { Chip } from "@/components/primitives/chip";
import { ChipGroup, ChipGroupItem, ChipGroupOptions } from "@/components/primitives/chip-group";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import { SelectField } from "@/components/primitives/select-field";
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
  // An event has one weapon and one age category, so filtering by either only
  // means something across a whole tournament.
  scope: "tournament" | "event";
}

function FencerFilterSheet({ tournamentId, scope }: FencerFilterSheetProps) {
  const { searchParams, setFilters } = useTournamentFilters();
  const [open, setOpen] = useState(false);
  const [weapon, setWeapon] = useState("");
  const [ageCategory, setAgeCategory] = useState("");
  const [rating, setRating] = useState("");
  const [gender, setGender] = useState("");

  const clubField = useFilterSearch(async (term) => {
    const query = new URLSearchParams({ limit: String(SUGGESTION_LIMIT), q: term });
    const result = await apiRequest<TeamListResult>(
      `/tournaments/${encodeURIComponent(tournamentId)}/teams?${query}`,
    );
    return result.data.map(({ name }) => ({ value: name, label: name }));
  });

  const activeTags = [
    { name: "Club", value: clubField.value, clear: () => clubField.reset() },
    ...(scope === "tournament"
      ? [
          {
            name: "Weapon",
            value: weapon && optionLabel(WEAPON_OPTIONS, weapon),
            clear: () => setWeapon(""),
          },
          {
            name: "Age Category",
            value: ageCategory && optionLabel(AGE_OPTIONS, ageCategory),
            clear: () => setAgeCategory(""),
          },
        ]
      : []),
    { name: "Rating", value: rating && optionLabel(RATING_OPTIONS, rating), clear: () => setRating("") },
    { name: "Gender", value: gender && optionLabel(GENDER_OPTIONS, gender), clear: () => setGender("") },
  ].filter((tag) => tag.value);

  return (
    <FilterSheetDialog
      open={open}
      onOpenChange={(next) => {
        // Each open starts from the filters in the URL, so closing without
        // "Show Fencers" throws the unsaved picks away.
        if (next) {
          clubField.reset(searchParams.get("team") ?? "");
          setWeapon(searchParams.get("weapon") ?? "");
          setAgeCategory(searchParams.get("ageCategory") ?? "");
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
        setWeapon("");
        setAgeCategory("");
        setRating("");
        setGender("");
      }}
      onSubmit={() => {
        setFilters({ team: clubField.submitValue(), weapon, ageCategory, rating, gender });
        setOpen(false);
      }}
    >
      {activeTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeTags.map((tag) => (
            <Chip key={tag.name} onDismiss={tag.clear} dismissLabel={`Remove ${tag.name}: ${tag.value}`}>
              {tag.name}: {tag.value}
            </Chip>
          ))}
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

      {scope === "tournament" && (
        <>
          <ChipGroup label="Weapon" value={weapon} onValueChange={setWeapon}>
            <ChipGroupOptions options={WEAPON_OPTIONS} />
          </ChipGroup>

          <SelectField
            label="Age Category"
            name="ageCategory"
            placeholder="Select age"
            options={AGE_OPTIONS}
            value={ageCategory}
            onValueChange={setAgeCategory}
          />
        </>
      )}

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
