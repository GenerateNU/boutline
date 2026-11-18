import { Pagination } from "@/components/primitives/pagination";
import { Text } from "@/components/primitives/text";
import { ClubCard } from "@/features/competitor/components/club-card";
import { ClubFilterSheet } from "@/features/competitor/components/club-filter-sheet";
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

  const { data, total, limit } = await getTeams(tournamentId, PAGE_SIZE, offset, search);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <SearchForm
          action={basePath}
          label="Search clubs"
          placeholder="Search clubs"
          defaultValue={search}
          suggest={{
            tournamentId,
            sources: [
              { kind: "fencers", href: `/tournaments/${tournamentId}/fencers` },
              { kind: "clubs", href: basePath },
            ],
          }}
        />
        <ClubFilterSheet />
      </div>

      {data.length === 0 ? (
        <Text variant="muted">
          {search
            ? `No clubs match “${search}”.`
            : "No clubs are competing in this tournament yet."}
        </Text>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((team) => (
            <li key={team.name}>
              <ClubCard
                team={team}
                href={`/tournaments/${tournamentId}/fencers?team=${encodeURIComponent(team.name)}`}
                pinned={false}
              />
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
    </div>
  );
}
