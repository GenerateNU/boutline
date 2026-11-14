import {
  formatDateParam,
  parseDateParam,
  todayDateParam,
} from "@/features/tournament/lib/date-param";
import type { TournamentStatus } from "@/features/tournament/types/tournament";
import { readOffsetParam, type SearchParams, readStringParam } from "@/lib/search-params";

const STATUSES: TournamentStatus[] = ["pending", "active", "ended"];
const MAX_CLUB_LENGTH = 120;
export const TOURNAMENT_PAGE_SIZE = 20;
export const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

export function parseTournamentFilters(query: SearchParams) {
  const day = parseDateParam(readStringParam(query, "date") || undefined);
  const tz = readStringParam(query, "tz") || undefined;
  const club = readStringParam(query, "club");
  const country = readStringParam(query, "country");

  return {
    offset: readOffsetParam(query),
    status: STATUSES.find((status) => status === query.status),
    // A day is always selected, so a missing or invalid one means today.
    date: day ? formatDateParam(day) : todayDateParam(tz),
    search: readStringParam(query, "q"),
    tz,
    // Values the backend would reject are dropped, since a 422 would break the page.
    club: club && club.length <= MAX_CLUB_LENGTH ? club : undefined,
    country: COUNTRY_CODE_PATTERN.test(country) ? country : undefined,
  };
}
