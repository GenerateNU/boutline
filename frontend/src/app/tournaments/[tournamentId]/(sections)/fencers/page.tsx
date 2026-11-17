import { notFound } from "next/navigation";

import { FencerBrowser } from "@/features/competitor/components/fencer-browser";
import { getTournament } from "@/features/tournament/services/getTournament";

export default async function FencersTab({
  params,
  searchParams,
}: PageProps<"/tournaments/[tournamentId]/fencers">) {
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);

  const tournament = await getTournament(tournamentId);
  if (!tournament) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <FencerBrowser
        tournamentId={tournamentId}
        basePath={`/tournaments/${tournamentId}/fencers`}
        query={query}
      />
    </div>
  );
}
