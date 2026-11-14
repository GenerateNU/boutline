import { notFound } from "next/navigation";

import { getEvents } from "@/features/event/services/getEvents";
import { TournamentInfoCard } from "@/features/tournament/components/tournament-info-card";
import { getTournament } from "@/features/tournament/services/getTournament";
import { eventsWithStatus, formatEventDateRange } from "@/lib/event-schedule";

import { EventListCard } from "../_components/event-list-card";

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
      <TournamentInfoCard name={tournament.name} dates={dates} />
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
      <EventListCard
        title="Completed Events"
        events={eventsWithStatus(events, "ended")}
        emptyMessage="No events have finished yet."
      />
    </div>
  );
}
