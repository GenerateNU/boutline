import { notFound } from "next/navigation";

import { BackButton } from "@/components/primitives/back-button";
import { TabNav } from "@/components/primitives/tab-nav";
import { getTournament } from "@/features/tournament/services/getTournament";

const TABS = [
  { label: "Pools", segment: "pooling" },
  { label: "Tableau", segment: "tableau" },
  { label: "Fencers", segment: "fencers" },
  { label: "Results", segment: "results" },
];

export default async function EventLayout({
  children,
  params,
}: LayoutProps<"/tournaments/[tournamentId]/events/[eventId]">) {
  const { tournamentId, eventId } = await params;

  const tournament = await getTournament(tournamentId);
  if (!tournament) {
    notFound();
  }

  return (
    <>
      <TabNav
        label="Event sections"
        basePath={`/tournaments/${tournamentId}/events/${eventId}`}
        tabs={TABS}
      />
      <div className="mx-auto flex w-full max-w-mobile flex-col gap-4 px-4 pt-4 pb-20">
        <BackButton href={`/tournaments/${tournamentId}`} className="self-start">
          {tournament.name}
        </BackButton>
        {children}
      </div>
    </>
  );
}
