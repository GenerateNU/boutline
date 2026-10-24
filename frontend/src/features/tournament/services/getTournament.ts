import type { Tournament } from "@/features/tournament/types/tournament";

// Server Components fetch Node-side, so this hits the backend directly
// instead of going through the /api rewrite in next.config.ts, which only
// applies to requests that reach the Next server over HTTP.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export async function getTournament(id: string): Promise<Tournament | null> {
  const url = new URL(`/api/v1/tournaments/${encodeURIComponent(id)}`, apiProxyTarget);

  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`get tournament: ${response.status}`);
  }

  return response.json();
}
