import { Text } from "@/components/primitives/text";
import { EventCard } from "@/features/event/components/event-card";
import { getCompetitors } from "@/features/competitor/services/getCompetitors";
import { EventFilterSheet } from "@/features/event/components/event-filter-sheet";
import {
  eventFilterChips,
  matchesEventFilters,
  parseEventFilters,
} from "@/features/event/lib/event-filters";
import { getEvents } from "@/features/event/services/getEvents";
import { ActiveFilterChips } from "@/components/primitives/active-filter-chips";
import { CalendarButton } from "@/features/tournament/components/calendar-button";
import { SearchForm } from "@/features/tournament/components/search-form";
import { WeekStrip } from "@/features/tournament/components/week-strip";
import { parseDateParam } from "@/features/tournament/lib/date-param";
import {
  eventDay,
  eventDays,
  formatTimeLabel,
  scheduleForDay,
  selectEventDay,
} from "@/lib/event-schedule";
import { readStringParam } from "@/lib/search-params";

// Only the total is needed, so ask for a single row.
async function competitorCount(tournamentId: string, eventId: string) {
  const { total } = await getCompetitors(tournamentId, 1, 0, { eventId });
  return [eventId, total] as const;
}

export default async function EventsTab({
  params,
  searchParams,
}: PageProps<"/tournaments/[tournamentId]/events">) {
  // params and searchParams are both Promises in Next 15+. Promise.all awaits
  // them in parallel, and the array destructuring unpacks the two results.
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);

  const search = readStringParam(query, "q");
  const requestedDay = readStringParam(query, "date");
  const filters = parseEventFilters(query);
  const chips = eventFilterChips(filters);
  const basePath = `/tournaments/${tournamentId}/events`;

  const events = await getEvents(tournamentId);

  const filteredEvents = events.filter((event) => matchesEventFilters(event, filters));
  const days = eventDays(filteredEvents);
  // A picked day without events still shows, as empty, so the list matches the week strip.
  const selectedDay = parseDateParam(requestedDay)
    ? requestedDay
    : selectEventDay(days, undefined, eventDay(new Date().toISOString()));
  const groups = scheduleForDay(filteredEvents, selectedDay, search);
  const shownEvents = groups.flatMap((group) => group.events);
  const competitorCounts = new Map(
    await Promise.all(shownEvents.map((event) => competitorCount(tournamentId, event.id))),
  );

  function emptyMessage() {
    if (events.length === 0) {
      return "No events have been added to this tournament yet.";
    }
    return search || chips.length > 0
      ? "No events match your search or filters."
      : "No events on this day.";
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <SearchForm action={basePath} label="Search events" placeholder="Search events" defaultValue={search} />
        <EventFilterSheet eventDays={days} />
      </div>
      <ActiveFilterChips filters={chips} />

      <div className="flex flex-wrap items-center gap-x-1 gap-y-3">
        <div className="min-w-0 flex-1">
          <WeekStrip surface="light" defaultDay={selectedDay ?? undefined} />
        </div>
        <CalendarButton inline defaultDay={selectedDay ?? undefined} eventDays={days} />
      </div>

      {groups.length === 0 && <Text variant="muted">{emptyMessage()}</Text>}
      {groups.map(({ startTime, events: grouped }) => (
        <section key={startTime ?? "tbc"} className="flex flex-col gap-3">
          <Text as="h2" variant="title">
            {startTime ? formatTimeLabel(startTime) : "Time TBC"}
          </Text>
          <ul className="flex flex-col gap-3">
            {grouped.map((event) => (
              <li key={event.id}>
                <EventCard event={event} competitorCount={competitorCounts.get(event.id) ?? 0} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
