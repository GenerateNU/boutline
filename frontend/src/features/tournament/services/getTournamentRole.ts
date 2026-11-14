import { getSessionToken } from "@/features/auth/services/session";
import type {
  TournamentRole,
  TournamentRoleResponse,
} from "@/features/tournament/types/tournament";

// Not apiRequest: it fetches the relative path /api/v1/..., which only resolves
// in the browser. Server Components fetch Node-side, where a relative URL
// throws, so this hits the backend directly instead of going through the /api
// rewrite in next.config.ts.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export async function getTournamentRole(tournamentId: string): Promise<TournamentRole | null> {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  const url = new URL(
    `/api/v1/tournaments/${encodeURIComponent(tournamentId)}/role`,
    API_PROXY_TARGET,
  );

  // The backend treats an expired token as signed out, so that comes back as null too.
  const response = await fetch(url, {
    cache: "no-store",
    // The /api proxy does this for browser calls; a server fetch sends the cookie's token itself.
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`get tournament role: ${response.status}`);
  }

  const body: TournamentRoleResponse = await response.json();
  return body.role;
}
