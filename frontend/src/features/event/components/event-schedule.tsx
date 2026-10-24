import { Section } from "@/components/primitives/section";
import { EventCard } from "@/features/event/components/event-card";
import { type EventTimeGroup, formatTimeLabel } from "@/lib/event-schedule";

type EventScheduleProps = {
  groups: EventTimeGroup[];
};

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
