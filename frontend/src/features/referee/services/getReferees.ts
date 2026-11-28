import { RefereeFilters, RefereeResponse } from "@/features/referee/types/referee";
import { serverRequest } from "@/services/server-request";
import { ListResponse } from "@/types/list-response";

// The caller passes the session token: without it the backend sees a signed-out
// caller, who gets no emails and can't filter by email.
export function getReferees(
  tournamentId: string,
  limit: number,
  offset: number,
  { query, email, pool }: RefereeFilters = {},
  token?: string,
): Promise<ListResponse<RefereeResponse>> {
  return serverRequest<ListResponse<RefereeResponse>>(`/tournaments/${tournamentId}/users`, {
    params: { role: "referee", limit, offset, q: query, email, pool },
    token,
  });
}
