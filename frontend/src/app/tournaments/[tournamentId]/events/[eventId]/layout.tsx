import { notFound } from "next/navigation";

import { BackButton } from "@/components/primitives/back-button";
import { TabPageOnly } from "@/components/primitives/tab-page-only";
import { Text } from "@/components/primitives/text";
import { getEvents } from "@/features/event/services/getEvents";
import { getTournament } from "@/features/tournament/services/getTournament";

import { EventTabNav } from "../_components/event-tab-nav";

export default async function EventLayout({
  children,
  params,
}: LayoutProps<"/tournaments/[tournamentId]/events/[eventId]">) {
  const { tournamentId, eventId } = await params;

  const [tournament, events] = await Promise.all([
    getTournament(tournamentId),
    getEvents(tournamentId),
  ]);
  const event = events.find(({ id }) => id === eventId);
  if (!tournament || !event) {
    notFound();
  }

  return (
    <>
      <EventTabNav />
      <div className="mx-auto flex w-full max-w-mobile flex-col gap-4 px-4 pt-4 pb-20">
        <TabPageOnly basePath={`/tournaments/${tournamentId}/events/${eventId}`}>
          <div className="flex flex-col gap-1">
            <BackButton href={`/tournaments/${tournamentId}`} className="self-start">
              {tournament.name}
            </BackButton>
            <Text as="h1" variant="heading" className="font-manrope">
              {event.name}
            </Text>
          </div>
        </TabPageOnly>
        {children}
      </div>
    </>
  );
}
