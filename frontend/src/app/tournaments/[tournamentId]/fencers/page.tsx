import { Pagination } from "@/components/primitives/pagination";
import { Section } from "@/components/primitives/section";
import { getCompetitors } from "@/features/competitor/services/getCompetitors";
import { SearchForm } from "@/features/tournament/components/search-form";
import { readOffsetParam, readStringParam } from "@/lib/search-params";

import { MockCountry } from "../_components/mock-country";

const PAGE_SIZE = 20;

export default async function FencersTab({
  params,
  searchParams,
}: PageProps<"/tournaments/[tournamentId]/fencers">) {
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);

  const search = readStringParam(query, "q");
  const offset = readOffsetParam(query);
  const basePath = `/tournaments/${tournamentId}/fencers`;

  const { data, total, limit } = await getCompetitors(
    tournamentId,
    PAGE_SIZE,
    offset,
    search,
  );

  return (
    <Section title="Fencers">
      <SearchForm
        action={basePath}
        label="Search fencers"
        placeholder="e.g. Jordan Lee"
        defaultValue={search}
      />

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search
            ? `No fencers match “${search}”.`
            : "No fencers have entered this tournament yet."}
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-foreground text-xs text-muted-foreground uppercase">
              <th scope="col" className="w-6 py-2 text-left font-medium">
                C
              </th>
              <th scope="col" className="py-2 text-left font-medium">
                Name
              </th>
              <th scope="col" className="py-2 text-left font-medium">
                Club
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Rating
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map(({ id, firstName, lastName, team, rating }) => (
              <tr key={id} className="border-b border-border">
                <td className="py-3 pr-2">
                  <MockCountry />
                </td>
                <td className="max-w-0 truncate py-3 pr-3">
                  {firstName} {lastName}
                </td>
                <td className="max-w-0 truncate py-3 pr-3 text-muted-foreground">
                  {team || "—"}
                </td>
                <td className="py-3 text-right tabular-nums">{rating}</td>
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
