import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
} from "@/components/primitives/card";
import { Chip } from "@/components/primitives/chip";
import { Section } from "@/components/primitives/section";
import { getEvents } from "@/features/event/services/getEvents";
import {
  eventDay,
  eventDays,
  eventStatusLabel,
  formatDayLabel,
  formatTimeLabel,
  scheduleForDay,
  selectEventDay,
} from "@/lib/event-schedule";

import { SearchForm } from "../../_components/search-form";
import { EventDateStrip } from "./_components/event-date-strip";

export default async function EventsTab({
  params,
  searchParams,
}: PageProps<"/tournaments/[tournamentId]/events">) {
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);

  const search = typeof query.q === "string" ? query.q.trim() : "";
  const requestedDay = typeof query.date === "string" ? query.date : undefined;
  const basePath = `/tournaments/${tournamentId}/events`;

  const { data, total } = await getEvents(tournamentId);

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

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">{emptyMessage()}</p>
      )}
      {groups.map(({ startTime, events }) => (
        <Section
          key={startTime ?? "tbc"}
          title={startTime ? formatTimeLabel(startTime) : "Time TBC"}
        >
          <ul className="flex flex-col gap-3">
            {events.map((event) => (
              <li key={event.id}>
                {/* A button with no handler: the event detail page is a separate ticket. */}
                <button type="button" className="w-full cursor-pointer text-left">
                  <Card
                    orientation="horizontal"
                    className="transition-colors hover:bg-muted"
                  >
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">
                        {event.name}
                      </CardTitle>
                      <CardAction>
                        <Chip className="text-xs">
                          {eventStatusLabel[event.status]}
                        </Chip>
                      </CardAction>
                    </CardHeader>
                  </Card>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      ))}

      {total > data.length && (
        <p className="text-xs text-muted-foreground">
          Showing the first {data.length} of {total} events.
        </p>
      )}
    </section>
  );
}
