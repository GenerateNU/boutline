import type { EventListResult } from "@/features/event/types/event";

// Server Components fetch Node-side, so this hits the backend directly
// instead of going through the /api rewrite in next.config.ts, which only
// applies to requests that reach the Next server over HTTP.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

// The backend's maximum page size. Callers filter and group this one page
// themselves, so there is no offset.
const EVENT_FETCH_LIMIT = 100;

export async function getEvents(tournamentId: string): Promise<EventListResult> {
  const url = new URL("/api/v1/events", apiProxyTarget);
  url.searchParams.set("tournament_id", tournamentId);
  url.searchParams.set("limit", String(EVENT_FETCH_LIMIT));

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`list events: ${response.status}`);
  }

  return response.json();
}
