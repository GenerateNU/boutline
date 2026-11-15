import { serverRequest } from "@/services/server-request";
import { TeamListResult } from "@/types/competitor";

export function getTeams(
  tournamentId: string,
  limit: number,
  offset: number,
  query?: string,
): Promise<TeamListResult> {
  return serverRequest<TeamListResult>(`/tournaments/${tournamentId}/teams`, {
    params: { limit, offset, q: query },
  });
}
