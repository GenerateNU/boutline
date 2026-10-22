import Link from "next/link";

import { Chip } from "@/components/primitives/chip";
import { Section } from "@/components/primitives/section";
import { getEvents } from "@/features/event/services/getEvents";
import type { EventStatus } from "@/features/event/types/event";

const statusLabels: Record<EventStatus, string> = {
  upcoming: "Upcoming",
  active: "Live",
  ended: "Past",
};

function formatStartTime(startTime: string | null) {
  if (startTime === null) {
    return "Time TBD";
  }
  return new Date(startTime).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface EventsTabProps extends PageProps<"/tournaments/[tournamentId]/events"> {}

export default async function EventsTab({ params }: EventsTabProps) {
  const { tournamentId } = await params;
  const { data: events } = await getEvents(tournamentId);

  return (
    <Section title="Events Tab" className="flex flex-col gap-4">
      <p>This is the events tab.</p>
      <p>lists of events in this tournament</p>
      <p>
        they should also be able to search / filter for events here, and see
        which events are past, live, and upcoming. We should also be able to support
        calendar view
      </p>
      {events.length === 0 && (
        <p className="text-sm text-muted-foreground">No events yet.</p>
      )}
      <ul className="flex flex-col gap-3">
        {events.map(({ id, name, start_time, status }) => (
          <li key={id}>
            <Link
              href={`/tournaments/${tournamentId}/events/${id}`}
              className="flex items-center justify-between gap-4 rounded-md border border-foreground px-4 py-3 transition-colors hover:bg-muted"
            >
              <p className="flex flex-col gap-1">
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatStartTime(start_time)}
                </span>
              </p>
              <Chip className="rounded-full text-xs">{statusLabels[status]}</Chip>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
