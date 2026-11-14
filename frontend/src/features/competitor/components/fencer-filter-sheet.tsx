"use client";

import FilterAltOutlined from "@mui/icons-material/FilterAltOutlined";
import { useState } from "react";

import { Chip } from "@/components/primitives/chip";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { useSearchSuggestions } from "@/lib/hooks/use-search-suggestions";
import { apiRequest } from "@/services/api-request";
import type { CompetitorListResult, TeamListResult } from "@/types/competitor";

const SUGGESTION_LIMIT = 10;

interface FencerFilterSheetProps {
  tournamentId: string;
}

function FencerFilterSheet({ tournamentId }: FencerFilterSheetProps) {
  const { searchParams, setFilters } = useTournamentFilters();
  const [open, setOpen] = useState(false);
  const [selectedFencer, setSelectedFencer] = useState("");
  const [selectedClub, setSelectedClub] = useState("");

  const fencerSearch = useSearchSuggestions(async (term) => {
    const query = new URLSearchParams({
      tournament_id: tournamentId,
      limit: String(SUGGESTION_LIMIT),
      q: term,
    });
    const result = await apiRequest<CompetitorListResult>(`/competitors?${query}`);
    return result.data.map(({ firstName, lastName }) => {
      const name = `${firstName} ${lastName}`;
      return { value: name, label: name };
    });
  });
  const clubSearch = useSearchSuggestions(async (term) => {
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
          setSelectedFencer(searchParams.get("q") ?? "");
          setSelectedClub(searchParams.get("team") ?? "");
          fencerSearch.clear();
          clubSearch.clear();
        }
        setOpen(next);
      }}
      triggerLabel="Filter fencers"
      triggerIcon={<FilterAltOutlined className="size-5! text-brand" />}
      description="Narrow the fencer list"
      submitLabel="Show Fencers"
      onReset={() => {
        setSelectedFencer("");
        setSelectedClub("");
        fencerSearch.clear();
        clubSearch.clear();
      }}
      onSubmit={() => {
        setFilters({ q: selectedFencer || undefined, team: selectedClub || undefined });
        setOpen(false);
      }}
    >
      {(selectedFencer || selectedClub) && (
        <div className="flex flex-wrap gap-2">
          {selectedFencer && (
            <Chip onDismiss={() => setSelectedFencer("")} dismissLabel={`Remove ${selectedFencer}`}>
              {selectedFencer}
            </Chip>
          )}
          {selectedClub && (
            <Chip onDismiss={() => setSelectedClub("")} dismissLabel={`Remove ${selectedClub}`}>
              {selectedClub}
            </Chip>
          )}
        </div>
      )}

      <FilterSearchField
        label="Fencer"
        value={fencerSearch.query}
        onChange={(event) => fencerSearch.change(event.target.value)}
        suggestions={fencerSearch.suggestions}
        failed={fencerSearch.failed}
        loading={fencerSearch.loading}
        selected={selectedFencer}
        onPick={(name) => {
          setSelectedFencer(name);
          fencerSearch.clear();
        }}
        noun="fencers"
      />

      {/* The fencer list's team filter is an exact match, so a club has to
          be picked from these fuzzy matches rather than typed in. */}
      <FilterSearchField
        label="Club"
        value={clubSearch.query}
        onChange={(event) => clubSearch.change(event.target.value)}
        suggestions={clubSearch.suggestions}
        failed={clubSearch.failed}
        loading={clubSearch.loading}
        selected={selectedClub}
        onPick={(name) => {
          setSelectedClub(name);
          clubSearch.clear();
        }}
        noun="clubs"
      />
    </FilterSheetDialog>
  );
}

export { FencerFilterSheet };
