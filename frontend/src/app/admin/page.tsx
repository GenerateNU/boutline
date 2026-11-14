import { AdminTournamentBrowser } from "@/features/tournament/components/admin-tournament-browser";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  return <AdminTournamentBrowser query={await searchParams} />;
}
