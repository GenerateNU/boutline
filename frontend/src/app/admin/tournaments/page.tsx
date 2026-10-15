import Link from "next/link";

import { Button } from "@/components/primitives/button";
import { Pagination } from "@/components/primitives/pagination";
import { Section } from "@/components/primitives/section";
import { TournamentList } from "@/components/tournament-list";
import { listTournaments } from "@/lib/tournaments";

export default async function AdminTournamentsPage({
  searchParams,
}: PageProps<"/admin/tournaments">) {
  const query = await searchParams;
  const offset = Math.max(0, Number(query.offset) || 0);

  const { data, total, limit } = await listTournaments({ offset });

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
