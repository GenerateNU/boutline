import { Pagination } from "@/components/primitives/pagination";
import { Section } from "@/components/primitives/section";
import { listTeams } from "@/lib/competitors";

import { SearchForm } from "../_components/search-form";

export default async function ClubsTab({
  params,
  searchParams,
}: PageProps<"/tournaments/[tournamentId]/clubs">) {
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);

  const search = typeof query.q === "string" ? query.q.trim() : "";
  const offset = Math.max(0, Number(query.offset) || 0);
  const basePath = `/tournaments/${tournamentId}/clubs`;

  const { data, total, limit } = await listTeams({
    tournamentId,
    search,
    offset,
  });

  return (
    <Section title="Clubs">
      <SearchForm
        action={basePath}
        placeholder="Search clubs"
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
          {/* TODO(#107): replace with List/ListItem from
              vindema/lofi-components-4 — club name as children, the fencer
              count as `trailing`. */}
          {data.map(({ name, competitorCount }) => (
            <li
              key={name}
              className="flex items-center justify-between gap-4 rounded-md border border-foreground px-4 py-3"
            >
              <span className="truncate text-sm font-medium">{name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {competitorCount} {competitorCount === 1 ? "fencer" : "fencers"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        total={total}
        limit={limit}
        offset={offset}
        basePath={basePath}
        search={search}
      />
    </Section>
  );
}
