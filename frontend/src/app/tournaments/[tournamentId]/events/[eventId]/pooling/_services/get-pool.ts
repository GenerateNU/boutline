import type { PoolBoard } from "../_types/pool-board";

// Not apiRequest: Server Components fetch Node-side, so this hits the backend directly, like getEventPools.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

// The backend answers 404 for an unknown pool and 422 for an id that isn't a UUID; both mean "no such pool".
const NOT_FOUND_STATUSES = [404, 422];

export async function getPool(poolId: string): Promise<PoolBoard | null> {
  const url = new URL(`/api/v1/pool-sheets/${encodeURIComponent(poolId)}`, API_PROXY_TARGET);
  const response = await fetch(url, { cache: "no-store" });
  if (NOT_FOUND_STATUSES.includes(response.status)) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`get pool sheet: ${response.status}`);
  }
  return response.json();
}
