"use client";

import { Funnel } from "lucide-react";
import { useRef, useState } from "react";

import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import { ClubOptions } from "@/features/competitor/components/club-options";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { apiRequest } from "@/services/api-request";
import type { Team, TeamListResult } from "@/types/competitor";

const debounceMs = 300;
const clubResultLimit = 10;

interface FencerFilterSheetProps {
  tournamentId: string;
}

function FencerFilterSheet({ tournamentId }: FencerFilterSheetProps) {
  const { searchParams, setFilters } = useTournamentFilters();
  const [open, setOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState("");
  const [clubs, setClubs] = useState<Team[] | null>(null);
  const [clubsFailed, setClubsFailed] = useState(false);
  const latestRequestId = useRef(0);

  async function searchClubs(term: string) {
    // Typing fires overlapping requests whose responses can arrive out of
    // order, so each gets an id and only the newest one may update the list.
    const requestId = ++latestRequestId.current;
    const query = new URLSearchParams({ limit: String(clubResultLimit) });
    if (term) {
      query.set("q", term);
    }
    try {
      const result = await apiRequest<TeamListResult>(
        `/tournaments/${encodeURIComponent(tournamentId)}/teams?${query}`,
      );
      if (requestId !== latestRequestId.current) {
        return;
      }
      setClubs(result.data);
      setClubsFailed(false);
    } catch {
      if (requestId !== latestRequestId.current) {
        return;
      }
      setClubsFailed(true);
    }
  }

  const [debouncedSearchClubs] = useDebouncedCallback(searchClubs, debounceMs);

  return (
    <FilterSheetDialog
      open={open}
      onOpenChange={(next) => {
        // Each open starts from the club in the URL, so closing without
        // "Show fencers" throws the unsaved pick away.
        if (next) {
          setSelectedClub(searchParams.get("team") ?? "");
          void searchClubs("");
        }
        setOpen(next);
      }}
      triggerLabel="Filter fencers"
      triggerIcon={<Funnel className="size-5! text-brand" />}
      description="Narrow the fencer list"
      submitLabel="Show fencers"
      onReset={() => setSelectedClub("")}
      onSubmit={() => {
        setFilters({ team: selectedClub || undefined });
        setOpen(false);
      }}
    >
      <FilterSearchField
        label="Club"
        onChange={(event) => debouncedSearchClubs(event.target.value.trim())}
      >
        {/* The fencer list's team filter is an exact match, so a club has to
            be picked from these fuzzy matches rather than typed in. */}
        <ClubOptions
          clubs={clubs}
          failed={clubsFailed}
          selectedClub={selectedClub}
          onToggleClub={(name) => setSelectedClub(name === selectedClub ? "" : name)}
        />
      </FilterSearchField>
    </FilterSheetDialog>
  );
}

export { FencerFilterSheet };
