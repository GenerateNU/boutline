import { notFound } from "next/navigation";

import { TabPageOnly } from "@/components/primitives/tab-page-only";
import { getCompetitors } from "@/features/competitor/services/getCompetitors";
import { getEvent } from "@/features/event/services/getEvent";

import { EventHeader } from "../_components/event-header";
import { EventTabNav } from "../_components/event-tab-nav";

export default async function EventDashboardLayout({
  children,
  params,
}: LayoutProps<"/admin/tournaments/[tournamentId]/events/[eventId]">) {
  const { tournamentId, eventId } = await params;
  // Only the total is needed, so a single row is asked for.
  const [event, { total: competitorCount }] = await Promise.all([
    getEvent(eventId),
    getCompetitors(tournamentId, 1, 0, { eventId }),
  ]);
  if (event?.tournament_id.toLowerCase() !== tournamentId.toLowerCase()) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col">
        <TabPageOnly
          basePath={`/admin/tournaments/${tournamentId}/events/${eventId}`}
          fallback={<h1 className="sr-only">{event.name}</h1>}
        >
          <EventHeader event={event} competitorCount={competitorCount} />
        </TabPageOnly>
        <EventTabNav />
      </div>
      {children}
    </div>
  );
}
