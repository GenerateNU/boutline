import type { EventListResult } from "@/features/event/types/event";

// Server Components fetch Node-side, so this hits the backend directly
// instead of going through the /api rewrite in next.config.ts, which only
// applies to requests that reach the Next server over HTTP.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export async function getEvents(
  tournamentId: string,
  limit: number,
  offset: number,
): Promise<EventListResult> {
  const url = new URL("/api/v1/events", apiProxyTarget);
  url.searchParams.set("tournament_id", tournamentId);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`list events: ${response.status}`);
  }

  return response.json();
}
