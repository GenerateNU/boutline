import { TournamentBrowser } from "@/features/tournament/components/tournament-browser";

export default async function TournamentsPage({
  searchParams,
}: PageProps<"/tournaments">) {
  return (
    <TournamentBrowser
      basePath="/tournaments"
      query={await searchParams}
      visibility="public"
    />
  );
}
