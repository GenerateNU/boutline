import { findFencerPool } from "@/features/pool/lib/find-fencer-pool";
import type {
  FencerPoolAssignment,
  Pool,
  PoolBout,
  PoolStage,
} from "@/features/pool/types/pool";
import type { ListResponse } from "@/types/list-response";

const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

// The backend's maximum page size; events have far fewer pools and pool bouts.
const PAGE_LIMIT = "100";

async function list<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(path, apiProxyTarget);
  for (const [key, value] of Object.entries({ ...params, limit: PAGE_LIMIT })) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`list ${path}: ${response.status}`);
  }

  const { data }: ListResponse<T> = await response.json();
  return data;
}

// Walks event → pool stages → pools → bouts, since no endpoint links a fencer
// to their pool directly. Pools are numbered within their own stage.
export async function getFencerPool(
  eventId: string,
  competitorId: string,
): Promise<FencerPoolAssignment | null> {
  const stages = await list<PoolStage>("/api/v1/pool-stages", { event_id: eventId });

  for (const stage of stages) {
    const pools = await list<Pool>("/api/v1/pools", { pool_stage_id: stage.id });
    const bouts = await Promise.all(
      pools.map((pool) => list<PoolBout>("/api/v1/bouts", { pool_id: pool.id })),
    );
    const boutsByPool = Object.fromEntries(pools.map((pool, i) => [pool.id, bouts[i]]));

    const assignment = findFencerPool(pools, boutsByPool, competitorId);
    if (assignment) {
      return assignment;
    }
  }

  return null;
}
