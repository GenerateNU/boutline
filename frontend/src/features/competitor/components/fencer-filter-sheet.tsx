"use client";

import FilterAltOutlined from "@mui/icons-material/FilterAltOutlined";
import { useState } from "react";

import { Chip } from "@/components/primitives/chip";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { useFilterSearch } from "@/lib/hooks/use-filter-search";
import { apiRequest } from "@/services/api-request";
import type { CompetitorListResult, TeamListResult } from "@/types/competitor";

const SUGGESTION_LIMIT = 10;

interface FencerFilterSheetProps {
  tournamentId: string;
}

function FencerFilterSheet({ tournamentId }: FencerFilterSheetProps) {
  const { searchParams, setFilters } = useTournamentFilters();
  const [open, setOpen] = useState(false);

  const fencerField = useFilterSearch(async (term) => {
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
          fencerField.reset(searchParams.get("q") ?? "");
          clubField.reset(searchParams.get("team") ?? "");
        }
        setOpen(next);
      }}
      triggerLabel="Filter fencers"
      triggerIcon={<FilterAltOutlined className="size-5! text-brand" />}
      description="Narrow the fencer list"
      submitLabel="Show Fencers"
      onReset={() => {
        fencerField.reset();
        clubField.reset();
      }}
      onSubmit={() => {
        setFilters({ q: fencerField.submitValue(), team: clubField.submitValue() });
        setOpen(false);
      }}
    >
      {(fencerField.value || clubField.value) && (
        <div className="flex flex-wrap gap-2">
          {fencerField.value && (
            <Chip onDismiss={() => fencerField.reset()} dismissLabel={`Remove ${fencerField.value}`}>
              {fencerField.value}
            </Chip>
          )}
          {clubField.value && (
            <Chip onDismiss={() => clubField.reset()} dismissLabel={`Remove ${clubField.value}`}>
              {clubField.value}
            </Chip>
          )}
        </div>
      )}

      <FilterSearchField
        label="Fencer"
        value={fencerField.query}
        onChange={(event) => fencerField.change(event.target.value)}
        suggestions={fencerField.suggestions}
        failed={fencerField.failed}
        loading={fencerField.loading}
        selected={fencerField.value}
        onPick={fencerField.pick}
        onCommitText={fencerField.commitText}
        maxLength={120}
        noun="fencers"
      />

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
    </FilterSheetDialog>
  );
}

export { FencerFilterSheet };
