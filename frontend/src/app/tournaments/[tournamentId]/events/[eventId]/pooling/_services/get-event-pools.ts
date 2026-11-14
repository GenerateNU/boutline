import type { PoolBoard, PoolBoardList } from "../_types/pool-board";

// Not apiRequest: it fetches the relative path /api/v1/..., which only resolves in the browser. Server
// Components fetch Node-side, so this hits the backend directly, like getEvents.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

// The backend's maximum page size.
const POOL_FETCH_LIMIT = 100;

async function getPoolPage(eventId: string, offset: number): Promise<PoolBoardList> {
  const url = new URL("/api/v1/pool-sheets", API_PROXY_TARGET);
  url.searchParams.set("event_id", eventId);
  url.searchParams.set("limit", String(POOL_FETCH_LIMIT));
  url.searchParams.set("offset", String(offset));

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`list pool sheets: ${response.status}`);
  }

  return response.json();
}

export async function getEventPools(eventId: string): Promise<PoolBoard[]> {
  const first = await getPoolPage(eventId, 0);
  const offsets = [];
  for (let offset = POOL_FETCH_LIMIT; offset < first.total; offset += POOL_FETCH_LIMIT) {
    offsets.push(offset);
  }
  const rest = await Promise.all(offsets.map((offset) => getPoolPage(eventId, offset)));
  return [first, ...rest].flatMap((page) => page.data);
}
