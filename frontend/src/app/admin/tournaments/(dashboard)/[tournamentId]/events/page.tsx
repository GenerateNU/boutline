import { Text } from "@/components/primitives/text";
import { getCompetitors } from "@/features/competitor/services/getCompetitors";
import { EventCard } from "@/features/event/components/event-card";
import { getEvents } from "@/features/event/services/getEvents";
import { byStartThenName } from "@/lib/event-schedule";

export default async function EventsTab({
  params,
}: PageProps<"/admin/tournaments/[tournamentId]/events">) {
  const { tournamentId } = await params;
  const events = (await getEvents(tournamentId)).toSorted(byStartThenName);
  // Only each event's total is needed, so ask for a single row.
  const counts = await Promise.all(
    events.map((event) => getCompetitors(tournamentId, 1, 0, { eventId: event.id })),
  );

  if (events.length === 0) {
    return <Text variant="muted">No events have been added to this tournament yet.</Text>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {events.map((event, index) => (
        <li key={event.id}>
          <EventCard
            event={event}
            competitorCount={counts[index].total}
            href={`/admin/tournaments/${tournamentId}/events/${event.id}`}
          />
        </li>
      ))}
    </ul>
  );
}
