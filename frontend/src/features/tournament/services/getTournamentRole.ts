import { getSessionToken } from "@/features/auth/services/session";
import { TournamentRole, TournamentRoleResponse } from "@/features/tournament/types/tournament";
import { serverRequest } from "@/services/server-request";

export async function getTournamentRole(tournamentId: string): Promise<TournamentRole | null> {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  // The backend treats an expired token as signed out, so that comes back as null too.
  const body = await serverRequest<TournamentRoleResponse>(
    `/tournaments/${encodeURIComponent(tournamentId)}/role`,
    { token },
  );
  return body.role;
}
