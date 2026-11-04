import { Pagination } from "@/components/primitives/pagination";
import { Section } from "@/components/primitives/section";
import { FencerCard } from "@/features/competitor/components/fencer-card";
import { FencerFilterSheet } from "@/features/competitor/components/fencer-filter-sheet";
import { getCompetitors } from "@/features/competitor/services/getCompetitors";
import { SearchForm } from "@/features/tournament/components/search-form";
import { readOffsetParam, readStringParam } from "@/lib/search-params";

const PAGE_SIZE = 20;

export default async function EventFencersTab({
  params,
  searchParams,
}: PageProps<"/tournaments/[tournamentId]/events/[eventId]/fencers">) {
  const [{ tournamentId, eventId }, query] = await Promise.all([params, searchParams]);

  const search = readStringParam(query, "q");
  const team = readStringParam(query, "team") || undefined;
  const offset = readOffsetParam(query);
  const basePath = `/tournaments/${tournamentId}/events/${eventId}/fencers`;

  // The backend has no event roster yet, so this lists the whole tournament.
  const { data, total, limit } = await getCompetitors(
    tournamentId,
    PAGE_SIZE,
    offset,
    search,
    team,
  );

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

      {team ? <p className="text-sm text-muted-foreground">Club: {team}</p> : null}

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search
            ? `No fencers match “${search}”.`
            : team
              ? "No fencers found for this club."
              : "No fencers have entered this tournament yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((competitor) => (
            <li key={competitor.id}>
              <FencerCard competitor={competitor} href={`${basePath}/${competitor.id}`} />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        total={total}
        limit={limit}
        offset={offset}
        basePath={basePath}
        params={{ q: search || undefined, team }}
      />
    </Section>
  );
}
