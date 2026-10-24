import { EventDateStrip } from "@/features/event/components/event-date-strip";
import { EventSchedule } from "@/features/event/components/event-schedule";
import { getEvents } from "@/features/event/services/getEvents";
import {
  eventDay,
  eventDays,
  formatDayLabel,
  scheduleForDay,
  selectEventDay,
} from "@/lib/event-schedule";

import { SearchForm } from "../../_components/search-form";

// The backend's maximum page size. Days and search are applied to this one
// page, so there is no Pagination here.
const EVENT_FETCH_LIMIT = 100;

export default async function EventsTab({
  params,
  searchParams,
}: PageProps<"/tournaments/[tournamentId]/events">) {
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);

  const search = typeof query.q === "string" ? query.q.trim() : "";
  const requestedDay = typeof query.date === "string" ? query.date : undefined;
  const basePath = `/tournaments/${tournamentId}/events`;

  const { data, total } = await getEvents(tournamentId, EVENT_FETCH_LIMIT, 0);

  const days = eventDays(data);
  const selectedDay = selectEventDay(
    days,
    requestedDay,
    eventDay(new Date().toISOString()),
  );
  const groups = scheduleForDay(data, selectedDay, search);

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
        placeholder="Enter Search Text"
        defaultValue={search}
        params={selectedDay ? { date: selectedDay } : undefined}
      />

      {selectedDay && (
        <EventDateStrip
          basePath={basePath}
          days={days}
          selected={selectedDay}
          search={search}
        />
      )}

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage()}</p>
      ) : (
        <EventSchedule groups={groups} />
      )}

      {total > data.length && (
        <p className="text-xs text-muted-foreground">
          Showing the first {data.length} of {total} events.
        </p>
      )}
    </section>
  );
}
