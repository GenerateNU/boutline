import { notFound } from "next/navigation";

import { BackButton } from "@/components/primitives/back-button";
import { Text } from "@/components/primitives/text";
import { getTournament } from "@/features/tournament/services/getTournament";

import { RememberTournamentName } from "../_components/remember-tournament-name";
import { TournamentTabNav } from "../_components/tournament-tab-nav";

// A route group, so the tournament tabs skip event pages, which carry their own tab bar.
// The tournament is fetched here once: the layout stays mounted across tab switches.
export default async function TournamentSectionsLayout({
  children,
  params,
}: LayoutProps<"/tournaments/[tournamentId]">) {
  const { tournamentId } = await params;

  const tournament = await getTournament(tournamentId);
  if (!tournament) {
    notFound();
  }

  return (
    <>
      <RememberTournamentName tournamentId={tournament.id} name={tournament.name} />
      <TournamentTabNav />
      <div className="mx-auto flex w-full max-w-mobile flex-col gap-4 px-4 pt-4 pb-20 font-manrope">
        <BackButton href="/tournaments" className="self-start">
          All tournaments
        </BackButton>
        <Text as="h1" variant="title" className="uppercase">
          {tournament.name}
        </Text>
        {children}
      </div>
    </>
  );
}
