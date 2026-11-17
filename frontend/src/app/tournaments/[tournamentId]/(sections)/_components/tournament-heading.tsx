import { notFound } from "next/navigation";

import { Text } from "@/components/primitives/text";
import { getTournament } from "@/features/tournament/services/getTournament";

interface TournamentHeadingProps {
  tournamentId: string;
}

export async function TournamentHeading({ tournamentId }: TournamentHeadingProps) {
  const tournament = await getTournament(tournamentId);
  if (!tournament) {
    notFound();
  }

  return (
    <Text as="h1" variant="title" className="uppercase">
      {tournament.name}
    </Text>
  );
}
