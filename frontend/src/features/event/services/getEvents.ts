import type { EventListResult } from "@/features/event/types/event";

const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

// 100 is the backend's page maximum, well above a tournament's event count.
const pageSize = 100;

export async function getEvents(tournamentId: string): Promise<EventListResult> {
  const url = new URL("/api/v1/events", apiProxyTarget);
  url.searchParams.set("tournament_id", tournamentId);
  url.searchParams.set("limit", String(pageSize));

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`list events: ${response.status}`);
  }

  return response.json();
}
