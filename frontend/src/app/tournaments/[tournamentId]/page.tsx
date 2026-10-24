import { notFound } from "next/navigation";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/primitives/card";
import { EventListCard } from "@/features/event/components/event-list-card";
import { getEvents } from "@/features/event/services/getEvents";
import { getTournament } from "@/features/tournament/services/getTournament";
import { eventsWithStatus, formatEventDateRange } from "@/lib/event-schedule";

// The backend's maximum page size.
const EVENT_FETCH_LIMIT = 100;

export default async function OverviewTab({
  params,
}: PageProps<"/tournaments/[tournamentId]">) {
  const { tournamentId } = await params;
  const [tournament, { data }] = await Promise.all([
    getTournament(tournamentId),
    getEvents(tournamentId, EVENT_FETCH_LIMIT, 0),
  ]);

  if (!tournament) {
    notFound();
  }

  const dates = formatEventDateRange(data, tournament.start_time);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={1}>
            {tournament.name}
          </CardTitle>
          {dates && <CardDescription>{dates}</CardDescription>}
        </CardHeader>
      </Card>
      <EventListCard
        title="Ongoing Events"
        events={eventsWithStatus(data, "active")}
        emptyMessage="No events are live right now."
      />
      <EventListCard
        title="Upcoming Events"
        events={eventsWithStatus(data, "upcoming")}
        emptyMessage="No upcoming events."
      />
    </div>
  );
}
