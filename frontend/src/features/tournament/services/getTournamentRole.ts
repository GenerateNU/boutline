import { sessionAuthHeaders } from "@/features/auth/services/session";
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
  const headers = await sessionAuthHeaders();
  if (!headers.Authorization) {
    return null;
  }

  const url = new URL(
    `/api/v1/tournaments/${encodeURIComponent(tournamentId)}/role`,
    API_PROXY_TARGET,
  );

  const response = await fetch(url, { cache: "no-store", headers });
  // An expired token counts as not an admin.
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`get tournament role: ${response.status}`);
  }

  const body: TournamentRoleResponse = await response.json();
  return body.role;
}
