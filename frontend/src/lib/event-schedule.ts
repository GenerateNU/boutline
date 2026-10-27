import type { EventStatus, TournamentEvent } from "@/features/event/types/event";

export interface EventTimeGroup {
  startTime: string | null;
  events: TournamentEvent[];
}

export const eventStatusLabel: Record<EventStatus, string> = {
  upcoming: "Upcoming",
  active: "Live",
  ended: "Past",
};

// Every formatter uses UTC so a day label matches eventDay(), which slices the
// UTC ISO string. Formatting in local time could put a late-evening event on
// the next or previous day.
const dayFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const longDayFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

// Turns a "YYYY-MM-DD" day key back into a Date so the formatters can label it.
const utcMidnight = (day: string) => new Date(`${day}T00:00:00Z`);

// Start time ascending with undated events last, then name, then id.
function byStartThenName(a: TournamentEvent, b: TournamentEvent): number {
  const aTime = a.start_time ? Date.parse(a.start_time) : Infinity;
  const bTime = b.start_time ? Date.parse(b.start_time) : Infinity;
  if (aTime !== bTime) {
    return aTime < bTime ? -1 : 1;
  }
  return a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id);
}

// Lowercases and strips accents, so a search for "epee" matches "Épée".
function fold(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// The UTC calendar day of a start time, as "YYYY-MM-DD". These keys sort
// correctly as plain strings, which the functions below rely on.
export function eventDay(startTime: string): string {
  return new Date(startTime).toISOString().slice(0, 10);
}

// Each day that has at least one scheduled event, earliest first.
export function eventDays(events: Pick<TournamentEvent, "start_time">[]): string[] {
  const days = events.flatMap(({ start_time }) => (start_time ? [eventDay(start_time)] : []));
  return [...new Set(days)].sort();
}

// The day the Events tab opens on: the day in the URL if it has events,
// otherwise today or the next day with events, otherwise the last event day.
export function selectEventDay(
  days: string[],
  requested: string | undefined,
  today: string,
): string | null {
  if (requested && days.includes(requested)) {
    return requested;
  }
  return days.find((day) => day >= today) ?? days[days.length - 1] ?? null;
}

// The `size` days shown in the date strip, centred on the selected day but
// shifted inward at either end so the strip is always full.
export function dayWindow(days: string[], selected: string, size: number): string[] {
  const maxStart = Math.max(0, days.length - size);
  const centred = days.indexOf(selected) - Math.floor(size / 2);
  const start = Math.min(Math.max(0, centred), maxStart);
  return days.slice(start, start + size);
}

// Events on `day` whose name matches `search`, grouped by start time.
// Events with no start time match every day. Sorting first means the Map's insertion order is already the display order.
export function scheduleForDay(
  events: TournamentEvent[],
  day: string | null,
  search: string,
): EventTimeGroup[] {
  const needle = fold(search);
  const groups = new Map<string | null, TournamentEvent[]>();

  for (const event of [...events].sort(byStartThenName)) {
    const startTime = event.start_time ? new Date(event.start_time).toISOString() : null;
    if ((startTime === null || eventDay(startTime) === day) && fold(event.name).includes(needle)) {
      groups.set(startTime, [...(groups.get(startTime) ?? []), event]);
    }
  }

  return [...groups].map(([startTime, grouped]) => ({ startTime, events: grouped }));
}

export function eventsWithStatus(
  events: TournamentEvent[],
  status: EventStatus,
): TournamentEvent[] {
  return events.filter((event) => event.status === status).sort(byStartThenName);
}

export function formatDayLabel(day: string): string {
  return dayFormat.format(utcMidnight(day));
}

// "October 12" for a one-day tournament, "October 12 – October 14" otherwise.
// Uses the tournament's own start time if no event has been scheduled yet.
export function formatEventDateRange(
  events: Pick<TournamentEvent, "start_time">[],
  fallbackStart: string | null,
): string | null {
  const days = eventDays(events);
  const first = days[0] ?? (fallbackStart ? eventDay(fallbackStart) : null);
  if (!first) {
    return null;
  }
  const last = days[days.length - 1] ?? first;
  const format = (day: string) => longDayFormat.format(utcMidnight(day));
  return first === last ? format(first) : `${format(first)} – ${format(last)}`;
}

export function formatTimeLabel(startTime: string): string {
  return timeFormat.format(new Date(startTime));
}
