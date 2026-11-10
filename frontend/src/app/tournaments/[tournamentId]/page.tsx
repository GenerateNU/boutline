import { Calendar, MapPin, User } from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/primitives/card";
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
      <Card className="gap-2.5">
        <CardTitle role="heading" aria-level={1} className="text-xl text-obsidian uppercase">
          {tournament.name}
        </CardTitle>
        {[
          { icon: Calendar, text: dates },
          { icon: MapPin, text: "Location - TBC" },
          { icon: User, text: "Organizer Contact - TBC" },
        ].map(
          ({ icon: Icon, text }) =>
            text && (
              <CardDescription key={text} className="flex items-center gap-2 text-sm text-obsidian">
                <Icon aria-hidden className="size-4 shrink-0 text-neutral-secondary" />
                {text}
              </CardDescription>
            ),
        )}
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
