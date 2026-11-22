import { notFound } from "next/navigation";

import { BackButton } from "@/components/primitives/back-button";
import { TabPageOnly } from "@/components/primitives/tab-page-only";
import { getEvent } from "@/features/event/services/getEvent";
import { getTournament } from "@/features/tournament/services/getTournament";

import { EventTabBody } from "../_components/event-tab-body";
import { EventTabNav } from "../_components/event-tab-nav";
import { EventTitle } from "../_components/event-title";

export default async function EventLayout({
  children,
  params,
}: LayoutProps<"/tournaments/[tournamentId]/events/[eventId]">) {
  const { tournamentId, eventId } = await params;

  const [tournament, event] = await Promise.all([getTournament(tournamentId), getEvent(eventId)]);
  // Compared with the tournament's own id rather than the URL's, which may differ in case.
  if (!tournament || event?.tournament_id !== tournament.id) {
    notFound();
  }

  return (
    <>
      <EventTabNav />
      <EventTabBody>
        <TabPageOnly
          basePath={`/tournaments/${tournamentId}/events/${eventId}`}
          fallback={<h1 className="sr-only">{event.name}</h1>}
        >
          <div className="flex flex-col gap-1">
            <BackButton href={`/tournaments/${tournamentId}`} className="self-start">
              {tournament.name}
            </BackButton>
            <EventTitle name={event.name} />
          </div>
        </TabPageOnly>
        {children}
      </EventTabBody>
    </>
  );
}
