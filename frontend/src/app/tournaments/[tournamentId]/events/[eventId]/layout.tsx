import { notFound } from "next/navigation";

import { BackButton } from "@/components/primitives/back-button";
import { getTournament } from "@/features/tournament/services/getTournament";

import { EventTabNav } from "../_components/event-tab-nav";

export default async function EventLayout({
  children,
  params,
}: LayoutProps<"/tournaments/[tournamentId]/events/[eventId]">) {
  const { tournamentId } = await params;

  const tournament = await getTournament(tournamentId);
  if (!tournament) {
    notFound();
  }

  return (
    <>
      <EventTabNav />
      <div className="mx-auto flex w-full max-w-mobile flex-col gap-4 px-4 pt-4 pb-20">
        <BackButton href={`/tournaments/${tournamentId}`} className="self-start">
          {tournament.name}
        </BackButton>
        {children}
      </div>
    </>
  );
}
