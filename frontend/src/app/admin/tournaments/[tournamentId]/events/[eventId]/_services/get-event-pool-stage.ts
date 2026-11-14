import type { PoolStageListResult, PoolStage } from "@/types/pool-stage";

// Not apiRequest: it fetches the relative path /api/v1/..., which only resolves
// in the browser. Server Components fetch Node-side, where a relative URL
// throws, so this hits the backend directly.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

// The newest stage for the event, or null when it has none.
export async function getEventPoolStage(eventId: string): Promise<PoolStage | null> {
  const url = new URL("/api/v1/pool-stages", API_PROXY_TARGET);
  url.searchParams.set("event_id", eventId);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`list pool stages: ${response.status}`);
  }

  const { data }: PoolStageListResult = await response.json();
  return data[0] ?? null;
}
