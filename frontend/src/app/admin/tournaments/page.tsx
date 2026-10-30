import { TournamentBrowser } from "@/features/tournament/components/tournament-browser";

export default async function AdminTournamentsPage({
  searchParams,
}: PageProps<"/admin/tournaments">) {
  return (
    <TournamentBrowser
      basePath="/admin/tournaments"
      query={await searchParams}
      canCreate
    />
  );
}
