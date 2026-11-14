import type {
  DirectElimination,
  DirectEliminationListResult,
} from "@/types/direct-elimination";

// Not apiRequest: it fetches the relative path /api/v1/..., which only resolves
// in the browser. Server Components fetch Node-side, where a relative URL
// throws, so this hits the backend directly.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

// The newest direct elimination for the event, or null when it has none.
export async function getEventDirectElimination(
  eventId: string,
): Promise<DirectElimination | null> {
  const url = new URL("/api/v1/direct-eliminations", API_PROXY_TARGET);
  url.searchParams.set("event_id", eventId);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`list direct eliminations: ${response.status}`);
  }

  const { data }: DirectEliminationListResult = await response.json();
  return data[0] ?? null;
}
