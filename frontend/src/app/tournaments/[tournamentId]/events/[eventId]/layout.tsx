import { notFound } from "next/navigation";

import { BackButton } from "@/components/primitives/back-button";
import { TabPageOnly } from "@/components/primitives/tab-page-only";
import { Text } from "@/components/primitives/text";
import { getEvent } from "@/features/event/services/getEvent";
import { getTournament } from "@/features/tournament/services/getTournament";

import { EventTabNav } from "../_components/event-tab-nav";

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
      <div className="mx-auto flex w-full max-w-mobile flex-col gap-4 px-4 pt-4 pb-20">
        <TabPageOnly
          basePath={`/tournaments/${tournamentId}/events/${eventId}`}
          fallback={<h1 className="sr-only">{event.name}</h1>}
        >
          <div className="flex flex-col gap-1">
            <BackButton href={`/tournaments/${tournamentId}`} className="self-start">
              {tournament.name}
            </BackButton>
            {/* One line, so the tableau's fixed height offset (12.5rem) holds for long names. */}
            <Text as="h1" variant="heading" className="truncate font-manrope">
              {event.name}
            </Text>
          </div>
        </TabPageOnly>
        {children}
      </div>
    </>
  );
}
