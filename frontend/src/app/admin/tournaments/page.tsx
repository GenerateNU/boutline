import Link from "next/link";

import { Button } from "@/components/primitives/button";
import { Pagination } from "@/components/primitives/pagination";
import { Section } from "@/components/primitives/section";
import { TournamentList } from "@/components/tournament-list";
import { getTournaments } from "@/features/tournament/services/getTournaments";
import { readOffsetParam } from "@/lib/search-params";

const PAGE_SIZE = 20;

export default async function AdminTournamentsPage({
  searchParams,
}: PageProps<"/admin/tournaments">) {
  const query = await searchParams;
  const offset = readOffsetParam(query);

  const { data, total, limit } = await getTournaments(PAGE_SIZE, offset);

  return (
    <main className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
      <Section title="Tournaments">
        <TournamentList tournaments={data} />
        <Pagination
          total={total}
          limit={limit}
          offset={offset}
          basePath="/admin/tournaments"
        />
        <Button asChild className="rounded-full">
          <Link href="/admin/tournament/new">New tournament</Link>
        </Button>
      </Section>
    </main>
  );
}
