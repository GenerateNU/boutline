import { notFound } from "next/navigation";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/primitives/card";
import { getEvents } from "@/features/event/services/getEvents";
import { getTournament } from "@/features/tournament/services/getTournament";
import { eventsWithStatus, formatEventDateRange } from "@/lib/event-schedule";

import { EventListCard } from "./_components/event-list-card";

export default async function OverviewTab({
  params,
}: PageProps<"/tournaments/[tournamentId]">) {
  const { tournamentId } = await params;
  const [tournament, events] = await Promise.all([
    getTournament(tournamentId),
    getEvents(tournamentId),
  ]);

  if (!tournament) {
    notFound();
  }

  const dates = formatEventDateRange(events, tournament.start_time);
  const ended = tournament.status === "ended";

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle role="heading" aria-level={1} className="font-normal">
            {tournament.name}
          </CardTitle>
          {dates && <CardDescription className="text-sm">{dates}</CardDescription>}
          {/* The backend has no venue or organizer fields yet. */}
          <CardDescription className="text-sm">Location - TBC</CardDescription>
          <CardDescription className="text-sm">Organizer Contact - TBC</CardDescription>
        </CardHeader>
      </Card>
      <EventListCard
        title="Ongoing Events"
        events={eventsWithStatus(events, "active")}
        emptyMessage={ended ? "Tournament has ended." : "No events are live right now."}
      />
      <EventListCard
        title="Upcoming Events"
        events={eventsWithStatus(events, "upcoming")}
        emptyMessage={ended ? "Tournament has ended." : "No upcoming events."}
      />
    </div>
  );
}
