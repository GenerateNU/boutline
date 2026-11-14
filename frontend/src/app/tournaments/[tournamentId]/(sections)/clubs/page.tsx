import { Pagination } from "@/components/primitives/pagination";
import { Section } from "@/components/primitives/section";
import { ClubCard } from "@/features/competitor/components/club-card";
import { getTeams } from "@/features/competitor/services/getTeams";
import { SearchForm } from "@/features/tournament/components/search-form";
import { readOffsetParam, readStringParam } from "@/lib/search-params";

const PAGE_SIZE = 20;

export default async function ClubsTab({
  params,
  searchParams,
}: PageProps<"/tournaments/[tournamentId]/clubs">) {
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);

  const search = readStringParam(query, "q");
  const offset = readOffsetParam(query);
  const basePath = `/tournaments/${tournamentId}/clubs`;

  const { data, total, limit } = await getTeams(
    tournamentId,
    PAGE_SIZE,
    offset,
    search,
  );

  return (
    <Section title="Clubs">
      <SearchForm
        action={basePath}
        label="Search clubs"
        placeholder="e.g. Boston Fencing Club"
        defaultValue={search}
      />

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search
            ? `No clubs match “${search}”.`
            : "No clubs are competing in this tournament yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((team) => (
            <li key={team.name}>
              <ClubCard team={team} pinned={false} />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        total={total}
        limit={limit}
        offset={offset}
        basePath={basePath}
        params={{ q: search }}
      />
    </Section>
  );
}
