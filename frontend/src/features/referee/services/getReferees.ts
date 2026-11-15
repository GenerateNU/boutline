import { RefereeResponse } from "@/features/referee/types/referee";
import { serverRequest } from "@/services/server-request";
import { ListResponse } from "@/types/list-response";

export function getReferees(
  tournamentId: string,
  limit: number,
  offset: number,
  query?: string,
): Promise<ListResponse<RefereeResponse>> {
  return serverRequest<ListResponse<RefereeResponse>>(`/tournaments/${tournamentId}/users`, {
    params: { role: "referee", limit, offset, q: query },
  });
}
