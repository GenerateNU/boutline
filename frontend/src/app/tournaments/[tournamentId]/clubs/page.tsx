import { Pagination } from "@/components/primitives/pagination";
import { Section } from "@/components/primitives/section";
import { getTeams } from "@/features/competitor/services/getTeams";
import { SearchForm } from "@/features/tournament/components/search-form";

import { MockCountry } from "../_components/mock-country";

const PAGE_SIZE = 20;

export default async function ClubsTab({
  params,
  searchParams,
}: PageProps<"/tournaments/[tournamentId]/clubs">) {
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);

  const search = typeof query.q === "string" ? query.q.trim() : "";
  const offset = Math.max(0, Number(query.offset) || 0);
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
        defaultValue={search}
      />

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search
            ? `No clubs match “${search}”.`
            : "No clubs are competing in this tournament yet."}
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-foreground text-xs text-muted-foreground uppercase">
              <th scope="col" className="w-6 py-2 text-left font-medium">
                C
              </th>
              <th scope="col" className="py-2 text-left font-medium">
                Club Name
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Fencers
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map(({ name, competitorCount }) => (
              <tr key={name} className="border-b border-border">
                <td className="py-3 pr-2">
                  <MockCountry />
                </td>
                <td className="max-w-0 truncate py-3 pr-3 font-medium">
                  {name}
                </td>
                <td className="py-3 text-right tabular-nums text-muted-foreground">
                  {competitorCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
