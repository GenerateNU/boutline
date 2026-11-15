import { dayRange } from "@/features/tournament/lib/day-range";
import { TournamentListFilters, TournamentListResult } from "@/features/tournament/types/tournament";
import { serverRequest } from "@/services/server-request";

// The caller passes the session token when it wants mine or the roles.
export function getTournaments(
  limit: number,
  offset: number,
  { query, status, visibility, date, timeZone, club, country, mine }: TournamentListFilters = {},
  token?: string,
): Promise<TournamentListResult> {
  const range = date ? dayRange(date, timeZone) : undefined;

  return serverRequest<TournamentListResult>("/tournaments", {
    params: {
      limit,
      offset,
      q: query,
      status,
      visibility,
      club,
      country,
      mine: mine ? "true" : undefined,
      start_from: range?.from.toISOString(),
      start_to: range?.to.toISOString(),
    },
    token,
  });
}
