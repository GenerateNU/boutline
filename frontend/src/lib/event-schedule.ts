import type { TournamentEvent } from "@/features/event/types/event";

export interface EventTimeGroup {
  startTime: string | null;
  events: TournamentEvent[];
}

const dayFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

export function eventDay(startTime: string): string {
  return new Date(startTime).toISOString().slice(0, 10);
}

export function eventDays(events: Pick<TournamentEvent, "start_time">[]): string[] {
  const days = new Set<string>();
  for (const event of events) {
    if (event.start_time) {
      days.add(eventDay(event.start_time));
    }
  }
  return [...days].sort();
}

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

export function dayWindow(days: string[], selected: string, size: number): string[] {
  const maxStart = Math.max(0, days.length - size);
  const centred = days.indexOf(selected) - Math.floor(size / 2);
  const start = Math.min(Math.max(0, centred), maxStart);
  return days.slice(start, start + size);
}

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function scheduleForDay(
  events: TournamentEvent[],
  day: string | null,
  search: string,
): EventTimeGroup[] {
  const needle = fold(search);
  const groups = new Map<string | null, TournamentEvent[]>();

  for (const event of events) {
    const startTime = event.start_time ? new Date(event.start_time).toISOString() : null;
    if (startTime !== null && eventDay(startTime) !== day) {
      continue;
    }
    if (!fold(event.name).includes(needle)) {
      continue;
    }
    groups.set(startTime, [...(groups.get(startTime) ?? []), event]);
  }

  return [...groups]
    .sort(([a], [b]) => {
      if (a === b) {
        return 0;
      }
      if (a === null) {
        return 1;
      }
      if (b === null) {
        return -1;
      }
      return a < b ? -1 : 1;
    })
    .map(([startTime, grouped]) => ({
      startTime,
      events: grouped.sort(
        (a, b) => a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id),
      ),
    }));
}

export function formatDayLabel(day: string): string {
  return dayFormat.format(new Date(`${day}T00:00:00Z`));
}

export function formatTimeLabel(startTime: string): string {
  return timeFormat.format(new Date(startTime));
}
