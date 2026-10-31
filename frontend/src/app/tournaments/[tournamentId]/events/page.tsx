import Link from "next/link";

import { buttonVariants } from "@/components/primitives/button";
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
} from "@/components/primitives/card";
import { Chip } from "@/components/primitives/chip";
import { Section } from "@/components/primitives/section";
import { getEvents } from "@/features/event/services/getEvents";
import { SearchForm } from "@/features/tournament/components/search-form";
import {
  eventDay,
  eventDays,
  eventStatusLabel,
  formatDayLabel,
  formatTimeLabel,
  scheduleForDay,
  selectEventDay,
} from "@/lib/event-schedule";
import { readStringParam } from "@/lib/search-params";

import { EventDateStrip } from "./_components/event-date-strip";

export default async function EventsTab({
  params,
  searchParams,
}: PageProps<"/tournaments/[tournamentId]/events">) {
  // params and searchParams are both Promises in Next 15+. Promise.all awaits
  // them in parallel, and the array destructuring unpacks the two results.
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);

  const search = readStringParam(query, "q");
  const requestedDay = readStringParam(query, "date") || undefined;
  const basePath = `/tournaments/${tournamentId}/events`;

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
      <Link
        href="/admin/tournament/new/event"
        className={buttonVariants({ className: "self-start rounded-2xl" })}
      >
        Add event
      </Link>

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
                <Link href={`${basePath}/${event.id}`} className="block">
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
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </section>
  );
}
