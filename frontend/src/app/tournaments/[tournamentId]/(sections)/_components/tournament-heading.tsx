import { Text } from "@/components/primitives/text";
import { getTournament } from "@/features/tournament/services/getTournament";

interface TournamentHeadingProps {
  tournamentId: string;
}

export async function TournamentHeading({ tournamentId }: TournamentHeadingProps) {
  const tournament = await getTournament(tournamentId);
  // Each tab 404s an unknown tournament itself, before streaming; from inside Suspense the status would stay 200.
  if (!tournament) {
    return null;
  }

  return (
    <Text as="h1" variant="title" className="uppercase">
      {tournament.name}
    </Text>
  );
}
