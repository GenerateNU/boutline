import type { EventListResult, TournamentEvent } from "@/features/event/types/event";

// Not apiRequest: it fetches the relative path /api/v1/..., which only resolves
// in the browser. Server Components fetch Node-side, where a relative URL
// throws, so this hits the backend directly instead of going through the /api
// rewrite in next.config.ts.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

// The backend's maximum page size.
const EVENT_FETCH_LIMIT = 100;

async function getEventPage(tournamentId: string, offset: number): Promise<EventListResult> {
  const url = new URL("/api/v1/events", apiProxyTarget);
  url.searchParams.set("tournament_id", tournamentId);
  url.searchParams.set("limit", String(EVENT_FETCH_LIMIT));
  url.searchParams.set("offset", String(offset));

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`list events: ${response.status}`);
  }

  return response.json();
}

// Every event in the tournament. The backend orders pages by creation time,
// not start time, so callers need all pages to build a day-by-day schedule.
export async function getEvents(tournamentId: string): Promise<TournamentEvent[]> {
  const first = await getEventPage(tournamentId, 0);
  const offsets = [];
  for (let offset = EVENT_FETCH_LIMIT; offset < first.total; offset += EVENT_FETCH_LIMIT) {
    offsets.push(offset);
  }
  const rest = await Promise.all(offsets.map((offset) => getEventPage(tournamentId, offset)));
  return [first, ...rest].flatMap((page) => page.data);
}
