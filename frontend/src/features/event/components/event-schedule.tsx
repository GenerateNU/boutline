import { Section } from "@/components/primitives/section";
import { EventCard } from "@/features/event/components/event-card";
import { EventDateStrip } from "@/features/event/components/event-date-strip";
import { getEvents } from "@/features/event/services/getEvents";
import { SearchForm } from "@/features/tournament/components/search-form";
import {
  eventDay,
  eventDays,
  formatDayLabel,
  formatTimeLabel,
  scheduleForDay,
  selectEventDay,
} from "@/lib/event-schedule";
import { readStringParam, type SearchParams } from "@/lib/search-params";

interface EventScheduleProps {
  tournamentId: string;
  basePath: string;
  query: SearchParams;
}

export async function EventSchedule({
  tournamentId,
  basePath,
  query,
}: EventScheduleProps) {
  const search = readStringParam(query, "q");
  const requestedDay = readStringParam(query, "date") || undefined;

  const events = await getEvents(tournamentId);

  const days = eventDays(events);
  const selectedDay = selectEventDay(
    days,
    requestedDay,
    eventDay(new Date().toISOString()),
  );
  const groups = scheduleForDay(events, selectedDay, search);

  function emptyMessage() {
    if (!search) {
      return "No events have been added to this tournament yet.";
    }
    return selectedDay
      ? `No events match “${search}” on ${formatDayLabel(selectedDay)}.`
      : `No events match “${search}”.`;
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-medium underline underline-offset-4">
        All Events
      </h2>
      <SearchForm
        action={basePath}
        label="Search events"
        placeholder="Enter Search Text"
        defaultValue={search}
      />

      {selectedDay && (
        <EventDateStrip
          basePath={basePath}
          days={days}
          selected={selectedDay}
          search={search}
        />
      )}

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">{emptyMessage()}</p>
      )}
      {groups.map(({ startTime, events: grouped }) => (
        <Section
          key={startTime ?? "tbc"}
          title={startTime ? formatTimeLabel(startTime) : "Time TBC"}
        >
          <ul className="flex flex-col gap-3">
            {grouped.map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </section>
  );
}
