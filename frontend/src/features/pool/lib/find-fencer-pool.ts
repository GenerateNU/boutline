import type { FencerPoolAssignment, Pool, PoolBout, PoolStatus } from "@/features/pool/types/pool";

export const poolStatusLabel: Record<PoolStatus, string> = {
  upcoming: "Upcoming",
  in_progress: "In Progress",
  finished: "Finished",
};

function poolStatus(pool: Pool): PoolStatus {
  if (pool.completed_at) {
    return "finished";
  }
  return pool.started_at ? "in_progress" : "upcoming";
}

// Locations are free text like "Strip 12"; the card already says STRIP.
function stripNumber(location: string): string {
  return location.replace(/^strip\s*/i, "");
}

// The backend has no pool-to-fencer table or pool number, so a fencer's pool
// is the one whose bouts they fence in, and pools are numbered by creation
// order (id breaks ties, since seeded pools share a timestamp).
export function findFencerPool(
  pools: Pool[],
  boutsByPool: Record<string, PoolBout[]>,
  competitorId: string,
): FencerPoolAssignment | null {
  const ordered = [...pools].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );

  for (const [index, pool] of ordered.entries()) {
    const bouts = boutsByPool[pool.id] ?? [];
    const fencerBouts = bouts.filter(
      (bout) => bout.competitor_1_id === competitorId || bout.competitor_2_id === competitorId,
    );
    if (fencerBouts.length === 0) {
      continue;
    }

    // Prefer the strip of a bout still to fence over one already finished.
    const current =
      fencerBouts.find((bout) => bout.status !== "ended" && bout.location) ??
      fencerBouts.find((bout) => bout.location);
    const fencers = new Set(bouts.flatMap((bout) => [bout.competitor_1_id, bout.competitor_2_id]));

    return {
      poolNumber: index + 1,
      strip: current?.location ? stripNumber(current.location) : null,
      status: poolStatus(pool),
      fencerCount: fencers.size,
    };
  }

  return null;
}
