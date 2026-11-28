import { notFound } from "next/navigation";

import { TabPageOnly } from "@/components/primitives/tab-page-only";
import { getCompetitors } from "@/features/competitor/services/getCompetitors";
import { getEvent } from "@/features/event/services/getEvent";

import { EventDashboardHeader } from "./_components/event-dashboard-header";
import { EventDashboardTabNav } from "./_components/event-dashboard-tab-nav";

export default async function EventDashboardLayout({
  children,
  params,
}: LayoutProps<"/admin/tournaments/[tournamentId]/events/[eventId]">) {
  const { tournamentId, eventId } = await params;
  const [event, competitors] = await Promise.all([
    getEvent(eventId),
    getCompetitors(tournamentId, 1, 0, { eventId }),
  ]);
  // Compared case-insensitively, since the URL's id may differ in case from the stored one.
  if (event?.tournament_id.toLowerCase() !== tournamentId.toLowerCase()) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <TabPageOnly
        basePath={`/admin/tournaments/${tournamentId}/events/${eventId}`}
        fallback={<h1 className="sr-only">{event.name}</h1>}
      >
        <EventDashboardHeader event={event} competitorCount={competitors.total} />
      </TabPageOnly>
      <EventDashboardTabNav />
      {children}
    </div>
  );
}
