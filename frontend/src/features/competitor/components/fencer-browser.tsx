import { Pagination } from "@/components/primitives/pagination";
import { Text } from "@/components/primitives/text";
import { FencerCard } from "@/features/competitor/components/fencer-card";
import { FencerFilterSheet } from "@/features/competitor/components/fencer-filter-sheet";
import { RATING_CATEGORIES } from "@/features/competitor/lib/rating-categories";
import { getCompetitors } from "@/features/competitor/services/getCompetitors";
import {
  ActiveFilterChips,
  type ActiveFilter,
} from "@/features/tournament/components/active-filter-chips";
import { SearchForm } from "@/features/tournament/components/search-form";
import { readOffsetParam, readStringParam, type SearchParams } from "@/lib/search-params";

const PAGE_SIZE = 20;

interface FencerBrowserProps {
  tournamentId: string;
  basePath: string;
  query: SearchParams;
}

async function FencerBrowser({ tournamentId, basePath, query }: FencerBrowserProps) {
  const search = readStringParam(query, "q");
  const team = readStringParam(query, "team");
  const ratingParam = readStringParam(query, "rating");
  // The backend rejects an unknown rating, so a hand-edited URL falls back to none.
  const rating = RATING_CATEGORIES.includes(ratingParam) ? ratingParam : "";
  const offset = readOffsetParam(query);

  const { data, total, limit } = await getCompetitors(tournamentId, PAGE_SIZE, offset, {
    query: search,
    team,
    rating,
  });

  const activeFilters: ActiveFilter[] = [
    { param: "team", label: team && `Club: ${team}` },
    { param: "rating", label: rating && `Rating: ${rating}` },
  ].filter((filter): filter is ActiveFilter => Boolean(filter.label));

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

      {data.length === 0 && (
        <Text variant="muted">
          {search ? `No fencers match "${search}".` : "No fencers found."}
        </Text>
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
        params={{ q: search, team, rating }}
      />
    </>
  );
}

export { FencerBrowser };
