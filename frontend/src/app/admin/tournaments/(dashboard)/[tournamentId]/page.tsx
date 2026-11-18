import { FencerBrowser } from "@/features/competitor/components/fencer-browser";
import { getTournamentRole } from "@/features/tournament/services/getTournamentRole";

export default async function FencersTab({
  params,
  searchParams,
}: PageProps<"/admin/tournaments/[tournamentId]">) {
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);
  const role = await getTournamentRole(tournamentId);

  return (
    <div className="flex flex-col gap-4">
      <FencerBrowser
        tournamentId={tournamentId}
        basePath={`/admin/tournaments/${tournamentId}`}
        query={query}
        canEdit={role === "admin"}
      />
    </div>
  );
}
