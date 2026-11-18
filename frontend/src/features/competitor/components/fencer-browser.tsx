import Link from "next/link";

import { ActiveFilterChips } from "@/components/primitives/active-filter-chips";
import { Button } from "@/components/primitives/button";
import { Text } from "@/components/primitives/text";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/primitives/tooltip";
import { CheckInCard } from "@/features/competitor/components/check-in-card";
import { FencerFilterSheet } from "@/features/competitor/components/fencer-filter-sheet";
import {
  FENCER_PAGE_SIZE,
  GENDER_OPTIONS,
  optionLabel,
  parseFencerFilters,
  RATING_OPTIONS,
} from "@/features/competitor/lib/fencer-filters";
import { getCompetitors } from "@/features/competitor/services/getCompetitors";
import { SearchForm } from "@/features/tournament/components/search-form";
import { readStringParam, type SearchParams } from "@/lib/search-params";

interface FencerBrowserProps {
  tournamentId: string;
  basePath: string;
  query: SearchParams;
  // Set on an event's page, which lists only that event's fencers.
  eventId?: string;
  // Admins get an Edit Mode button (?edit=1) that turns check-in into checkboxes.
  canEdit?: boolean;
}

interface EmptyMessageInput {
  search: string;
  hasFilters: boolean;
  eventId?: string;
}

function emptyMessage({ search, hasFilters, eventId }: EmptyMessageInput) {
  if (search) {
    return `No fencers match “${search}”.`;
  }
  if (hasFilters) {
    return "No fencers match these filters.";
  }
  if (eventId) {
    return "No fencers have entered this event yet.";
  }
  return "No fencers have entered this tournament yet.";
}

// The searchable, filterable fencer list shared by the tournament and event Fencers tabs.
async function FencerBrowser({ tournamentId, basePath, query, eventId, canEdit = false }: FencerBrowserProps) {
  const { search, team, rating, gender } = parseFencerFilters(query);
  const editing = canEdit && readStringParam(query, "edit") === "1";

  const { data, total, checkedIn, limit } = await getCompetitors(tournamentId, FENCER_PAGE_SIZE, 0, {
    eventId,
    query: search,
    team,
    rating,
    gender,
  });

  const activeFilters = [
    { param: "team", name: "Club", value: team },
    { param: "rating", name: "Rating", value: rating && optionLabel(RATING_OPTIONS, rating) },
    { param: "gender", name: "Gender", value: gender && optionLabel(GENDER_OPTIONS, gender) },
  ];
  const hasFilters = Boolean(team || rating || gender);

  return (
    <>
      <div className="flex items-center gap-2.5">
        <SearchForm
          action={basePath}
          label="Search fencers"
          placeholder="Search fencers"
          defaultValue={search}
          suggest={{ tournamentId, sources: [{ kind: "fencers", href: basePath }] }}
        />
        <FencerFilterSheet tournamentId={tournamentId} />
      </div>

      <ActiveFilterChips filters={activeFilters} />

      {canEdit && (
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href={editing ? basePath : `${basePath}?edit=1`}>{editing ? "Done" : "Edit Mode"}</Link>
          </Button>
          {editing && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button size="sm" variant="outline" disabled>
                    Add fencers
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {data.length > 0 && (
        <CheckInCard
          competitors={data}
          checkedInTotal={checkedIn}
          editable={editing}
          source={{ tournamentId, eventId, query: search, team, rating, gender }}
          total={total}
          pageSize={limit}
        />
      )}

      {data.length === 0 && (
        <Text variant="muted">{emptyMessage({ search, hasFilters, eventId })}</Text>
      )}

    </>
  );
}

export { FencerBrowser };
