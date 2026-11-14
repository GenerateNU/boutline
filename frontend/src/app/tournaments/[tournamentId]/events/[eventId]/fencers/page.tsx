import { ActiveFilterChips } from "@/components/primitives/active-filter-chips";
import { Pagination } from "@/components/primitives/pagination";
import { Section } from "@/components/primitives/section";
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
import { SearchForm } from "@/features/tournament/components/search-form";

export default async function EventFencersTab({
  params,
  searchParams,
}: PageProps<"/tournaments/[tournamentId]/events/[eventId]/fencers">) {
  const [{ tournamentId, eventId }, query] = await Promise.all([params, searchParams]);

  const { offset, search, team, rating, gender } = parseFencerFilters(query);
  const basePath = `/tournaments/${tournamentId}/events/${eventId}/fencers`;

  // The backend has no event roster yet, so this lists the whole tournament.
  const { data, total, limit } = await getCompetitors(tournamentId, FENCER_PAGE_SIZE, offset, {
    query: search,
    team,
    rating,
    gender,
  });

  const hasFilters = Boolean(team || rating || gender);

  return (
    <Section title="Fencers">
      <p className="text-sm text-muted-foreground">
        Showing every fencer in this tournament — event entries aren&apos;t tracked yet.
      </p>

      <div className="flex items-center gap-2">
        <SearchForm
          action={basePath}
          label="Search fencers"
          placeholder="Enter search text"
          defaultValue={search}
        />
        <FencerFilterSheet tournamentId={tournamentId} />
      </div>

      <ActiveFilterChips
        filters={[
          { param: "team", name: "Club", value: team },
          { param: "rating", name: "Rating", value: rating && optionLabel(RATING_OPTIONS, rating) },
          { param: "gender", name: "Gender", value: gender && optionLabel(GENDER_OPTIONS, gender) },
        ]}
      />

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search
            ? `No fencers match “${search}”.`
            : hasFilters
              ? "No fencers match these filters."
              : "No fencers have entered this tournament yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((competitor) => (
            <li key={competitor.id}>
              <FencerCard competitor={competitor} pinned={false} />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        total={total}
        limit={limit}
        offset={offset}
        basePath={basePath}
        params={{ q: search || undefined, team, rating, gender }}
      />
    </Section>
  );
}
