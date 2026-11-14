import { AdminTournamentBrowser } from "@/features/tournament/components/admin-tournament-browser";

export default async function AdminTournamentsPage({
  searchParams,
}: PageProps<"/admin/tournaments">) {
  return <AdminTournamentBrowser query={await searchParams} />;
}
