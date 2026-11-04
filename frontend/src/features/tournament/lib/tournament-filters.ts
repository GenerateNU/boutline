import { formatDateParam, parseDateParam } from "@/features/tournament/lib/date-param";
import type { TournamentStatus } from "@/features/tournament/types/tournament";
import { readOffsetParam, type SearchParams, readStringParam } from "@/lib/search-params";

const statuses: TournamentStatus[] = ["pending", "active", "ended"];

export function parseTournamentFilters(query: SearchParams) {
  const calendarView = query.view === "calendar";
  const day = parseDateParam(readStringParam(query, "date") || undefined);

  return {
    offset: readOffsetParam(query),
    status: statuses.find((status) => status === query.status),
    day,
    date: day && formatDateParam(day),
    calendarView,
    search: calendarView ? "" : readStringParam(query, "q"),
    tz: readStringParam(query, "tz") || undefined,
  };
}
