import { Pagination } from "@/components/primitives/pagination";
import { Section } from "@/components/primitives/section";
import { TournamentList } from "@/components/tournament-list";
import { listTournaments } from "@/lib/tournaments";

import { SearchForm } from "./_components/search-form";

export default async function TournamentsPage({
  searchParams,
}: PageProps<"/tournaments">) {
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q.trim() : "";
  const offset = Math.max(0, Number(query.offset) || 0);

  const { data, total, limit } = await listTournaments({ search, offset });

  return (
    <div className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
      <Section title="Tournaments" className="flex flex-col gap-4">
        <SearchForm
          action="/tournaments"
          placeholder="Search tournaments"
          defaultValue={search}
        />
        <TournamentList
          tournaments={data}
          emptyMessage={
            search ? `No tournaments match “${search}”.` : undefined
          }
        />
        <Pagination
          total={total}
          limit={limit}
          offset={offset}
          basePath="/tournaments"
          search={search}
        />
      </Section>
    </div>
  );
}
