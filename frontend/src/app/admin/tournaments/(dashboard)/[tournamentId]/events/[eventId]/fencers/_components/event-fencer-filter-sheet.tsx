"use client";

import SearchOutlined from "@mui/icons-material/SearchOutlined";
import { useState } from "react";

import { Chip } from "@/components/primitives/chip";
import { ChipGroup, ChipGroupItem } from "@/components/primitives/chip-group";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import { SelectField } from "@/components/primitives/select-field";
import { TextField } from "@/components/primitives/text-field";
import { optionLabel } from "@/features/competitor/lib/fencer-filters";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { useFilterSearch } from "@/lib/hooks/use-filter-search";
import { apiRequest } from "@/services/api-request";
import type { TeamListResult } from "@/types/competitor";

import { EMD_FORM_FIELDS } from "../../_components/emd-form-fields";
import { CHECK_IN_OPTIONS } from "../_lib/check-in-filter";
import { NO_RATING, RATING_CHOICES } from "../_lib/rating-choices";

const SUGGESTION_LIMIT = 10;

interface EventFencerFilterSheetProps {
  tournamentId: string;
}

// The dashboard's fencer filter: name, check-in, club and rating, each kept in the URL.
function EventFencerFilterSheet({ tournamentId }: EventFencerFilterSheetProps) {
  const { searchParams, setFilters } = useTournamentFilters();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [checkedIn, setCheckedIn] = useState("");
  const [rating, setRating] = useState("");

  const clubField = useFilterSearch(async (term) => {
    const query = new URLSearchParams({ limit: String(SUGGESTION_LIMIT), q: term });
    const result = await apiRequest<TeamListResult>(`/tournaments/${encodeURIComponent(tournamentId)}/teams?${query}`);
    return result.data.map(({ name: team }) => ({ value: team, label: team }));
  });

  const activeTags = [
    { name: "Fencer", value: name.trim(), clear: () => setName("") },
    { name: "Check in", value: checkedIn && optionLabel(CHECK_IN_OPTIONS, checkedIn), clear: () => setCheckedIn("") },
    { name: "Club", value: clubField.value, clear: () => clubField.reset() },
    { name: "Rating", value: rating, clear: () => setRating("") },
  ].filter((tag) => tag.value);

  function reset() {
    setName("");
    setCheckedIn("");
    clubField.reset();
    setRating("");
  }

  return (
    <FilterSheetDialog
      open={open}
      onOpenChange={(next) => {
        // Each open starts from the URL, so closing without Show Fencers drops unsaved picks.
        if (next) {
          setName(searchParams.get("q") ?? "");
          setCheckedIn(searchParams.get("checkedIn") ?? "");
          clubField.reset(searchParams.get("team") ?? "");
          setRating(searchParams.get("rating") ?? "");
        }
        setOpen(next);
      }}
      triggerLabel="Filter fencers"
      description="Narrow the fencer list"
      submitLabel="Show Fencers"
      onReset={reset}
      onSubmit={() => {
        setFilters({ q: name.trim(), checkedIn, team: clubField.submitValue(), rating });
        setOpen(false);
      }}
    >
      <div className={EMD_FORM_FIELDS}>
        {activeTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeTags.map((tag) => (
              <Chip key={tag.name} onDismiss={tag.clear} dismissLabel={`Remove ${tag.name}: ${tag.value}`}>
                {tag.name}: {tag.value}
              </Chip>
            ))}
          </div>
        )}
        <TextField
          label="Fencer"
          placeholder="Search fencers"
          value={name}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          trailing={<SearchOutlined aria-hidden />}
        />
        <ChipGroup label="Check in Status" value={checkedIn} onValueChange={setCheckedIn}>
          {CHECK_IN_OPTIONS.map(({ value, label }) => (
            <ChipGroupItem key={value} value={value} className="flex-1">
              {label}
            </ChipGroupItem>
          ))}
        </ChipGroup>
        <FilterSearchField
          label="Club"
          placeholder="Search clubs"
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
        <SelectField
          label="Rating"
          name="rating"
          options={RATING_CHOICES}
          value={rating}
          // None clears the filter, putting the placeholder back.
          onValueChange={(value) => setRating(value === NO_RATING ? "" : value)}
        />
      </div>
    </FilterSheetDialog>
  );
}

export { EventFencerFilterSheet };
