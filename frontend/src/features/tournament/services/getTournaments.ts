import type { TournamentListResult } from "@/features/tournament/types/tournament";

// Server Components fetch Node-side, so this hits the backend directly
// instead of going through the /api rewrite in next.config.ts, which only
// applies to requests that reach the Next server over HTTP.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export async function getTournaments(
  limit: number,
  offset: number,
  query?: string,
): Promise<TournamentListResult> {
  const url = new URL("/api/v1/tournaments", apiProxyTarget);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (query) {
    url.searchParams.set("q", query);
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`list tournaments: ${response.status}`);
  }

  return response.json();
}
