import { formatDateParam, parseDateParam } from "@/features/tournament/lib/date-param";
import type { TournamentStatus } from "@/features/tournament/types/tournament";

type SearchParams = Record<string, string | string[] | undefined>;

const statuses: TournamentStatus[] = ["pending", "active", "ended"];

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function parseTournamentFilters(query: SearchParams) {
  const calendarView = query.view === "calendar";
  const day = parseDateParam(single(query.date));

  return {
    offset: Math.max(0, Number(query.offset) || 0),
    status: statuses.find((status) => status === query.status),
    day,
    date: day && formatDateParam(day),
    calendarView,
    search: calendarView ? "" : (single(query.q)?.trim() ?? ""),
    tz: single(query.tz),
  };
}
