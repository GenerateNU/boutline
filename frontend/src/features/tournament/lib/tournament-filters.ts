import { formatDateParam, parseDateParam } from "@/features/tournament/lib/date-param";
import type { TournamentStatus } from "@/features/tournament/types/tournament";
import { readOffsetParam, type SearchParams, readStringParam } from "@/lib/search-params";

const statuses: TournamentStatus[] = ["pending", "active", "ended"];
const maxClubLength = 120;
export const tournamentPageSize = 20;
export const countryCodePattern = /^[A-Z]{2}$/;

export function parseTournamentFilters(query: SearchParams) {
  const calendarView = query.view === "calendar";
  const day = parseDateParam(readStringParam(query, "date") || undefined);
  const club = readStringParam(query, "club");
  const country = readStringParam(query, "country");

  return {
    offset: readOffsetParam(query),
    status: statuses.find((status) => status === query.status),
    day,
    date: day && formatDateParam(day),
    calendarView,
    search: calendarView ? "" : readStringParam(query, "q"),
    tz: readStringParam(query, "tz") || undefined,
    // Values the backend would reject are dropped, since a 422 would break the page.
    club: club && club.length <= maxClubLength ? club : undefined,
    country: countryCodePattern.test(country) ? country : undefined,
  };
}
