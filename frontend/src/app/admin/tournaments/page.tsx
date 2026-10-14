import Link from "next/link";

import { Button } from "@/components/primitives/button";
import { Section } from "@/components/primitives/section";
import { TournamentList } from "@/components/tournament-list";
import { listTournaments } from "@/lib/tournaments";

export default async function AdminTournamentsPage() {
  const { data } = await listTournaments();

  return (
    <main className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
      <Section title="Tournaments">
        <TournamentList tournaments={data} />
        <Button asChild className="rounded-full">
          <Link href="/admin/tournament/new">New tournament</Link>
        </Button>
      </Section>
    </main>
  );
}
