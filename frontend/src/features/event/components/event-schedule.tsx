import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
} from "@/components/primitives/card";
import { Section } from "@/components/primitives/section";
import { EventStatusChip } from "@/features/event/components/event-status-chip";
import type { TournamentEvent } from "@/features/event/types/event";
import { type EventTimeGroup, formatTimeLabel } from "@/lib/event-schedule";

interface EventScheduleProps {
  groups: EventTimeGroup[];
}

interface EventCardProps {
  event: TournamentEvent;
}

// A button with no handler: the event detail page is a separate ticket, which
// will swap this for a Link.
function EventCard({ event }: EventCardProps) {
  return (
    <button type="button" className="w-full cursor-pointer text-left">
      <Card orientation="horizontal" className="transition-colors hover:bg-muted">
        <CardHeader>
          <CardTitle className="text-sm font-medium">{event.name}</CardTitle>
          <CardAction>
            <EventStatusChip status={event.status} />
          </CardAction>
        </CardHeader>
      </Card>
    </button>
  );
}

function EventSchedule({ groups }: EventScheduleProps) {
  return groups.map(({ startTime, events }) => (
    <Section
      key={startTime ?? "tbc"}
      title={startTime ? formatTimeLabel(startTime) : "Time TBC"}
    >
      <ul className="flex flex-col gap-3">
        {events.map((event) => (
          <li key={event.id}>
            <EventCard event={event} />
          </li>
        ))}
      </ul>
    </Section>
  ));
}

export { EventSchedule };
