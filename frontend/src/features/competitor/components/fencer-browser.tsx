import { ActiveFilterChips } from "@/components/primitives/active-filter-chips";
import { Pagination } from "@/components/primitives/pagination";
import { Text } from "@/components/primitives/text";
import { FencerCard } from "@/features/competitor/components/fencer-card";
import { FencerFilterSheet } from "@/features/competitor/components/fencer-filter-sheet";
import {
  FENCER_PAGE_SIZE,
  GENDER_OPTIONS,
  optionLabel,
  parseFencerFilters,
  RATING_OPTIONS,
} from "@/features/competitor/lib/fencer-filters";
import { getCompetitors } from "@/features/competitor/services/getCompetitors";
import { AGE_OPTIONS, WEAPON_OPTIONS } from "@/features/event/lib/event-filters";
import { SearchForm } from "@/features/tournament/components/search-form";
import type { SearchParams } from "@/lib/search-params";

interface FencerBrowserProps {
  tournamentId: string;
  basePath: string;
  query: SearchParams;
  // Set on an event's page, which lists only that event's fencers.
  eventId?: string;
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
async function FencerBrowser({ tournamentId, basePath, query, eventId }: FencerBrowserProps) {
  const { offset, search, team, rating, gender, weapon, ageCategory } = parseFencerFilters(query);

  const { data, total, limit } = await getCompetitors(tournamentId, FENCER_PAGE_SIZE, offset, {
    eventId,
    query: search,
    team,
    rating,
    gender,
    weapon,
    ageCategory,
  });

  const activeFilters = [
    { param: "team", name: "Club", value: team },
    { param: "weapon", name: "Weapon", value: weapon && optionLabel(WEAPON_OPTIONS, weapon) },
    {
      param: "ageCategory",
      name: "Age Category",
      value: ageCategory && optionLabel(AGE_OPTIONS, ageCategory),
    },
    { param: "rating", name: "Rating", value: rating && optionLabel(RATING_OPTIONS, rating) },
    { param: "gender", name: "Gender", value: gender && optionLabel(GENDER_OPTIONS, gender) },
  ];
  const hasFilters = Boolean(team || rating || gender || weapon || ageCategory);

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
        <FencerFilterSheet tournamentId={tournamentId} scope={eventId ? "event" : "tournament"} />
      </div>

      <ActiveFilterChips filters={activeFilters} />

      {data.length === 0 && (
        <Text variant="muted">{emptyMessage({ search, hasFilters, eventId })}</Text>
      )}

      <ul className="flex flex-col gap-3">
        {data.map((competitor) => (
          <li key={competitor.id}>
            <FencerCard competitor={competitor} pinned={false} />
          </li>
        ))}
      </ul>

      <Pagination
        total={total}
        limit={limit}
        offset={offset}
        basePath={basePath}
        params={{ q: search || undefined, team, rating, gender, weapon, ageCategory }}
      />
    </>
  );
}

export { FencerBrowser };
