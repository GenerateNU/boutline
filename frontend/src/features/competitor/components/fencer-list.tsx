import { Pagination } from "@/components/primitives/pagination";
import { Section } from "@/components/primitives/section";
import { FencerCard } from "@/features/competitor/components/fencer-card";
import { getCompetitors } from "@/features/competitor/services/getCompetitors";
import { SearchForm } from "@/features/tournament/components/search-form";
import {
  readOffsetParam,
  readStringParam,
  type SearchParams,
} from "@/lib/search-params";

const PAGE_SIZE = 20;

interface FencerListProps {
  tournamentId: string;
  basePath: string;
  query: SearchParams;
}

export async function FencerList({
  tournamentId,
  basePath,
  query,
}: FencerListProps) {
  const search = readStringParam(query, "q");
  const offset = readOffsetParam(query);

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
        params={{ q: search }}
      />
    </Section>
  );
}
