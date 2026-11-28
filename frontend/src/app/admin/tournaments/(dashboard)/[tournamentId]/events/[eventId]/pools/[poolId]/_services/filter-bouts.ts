import { fencerName } from "@/features/pool/lib/fencer-name";
import type { PoolBoard, PoolBout, PoolStatus } from "@/features/pool/types/pool-board";

export function filterBouts(pool: PoolBoard, search: string, statuses: PoolStatus[]): PoolBout[] {
  const query = search.trim().toLowerCase();
  // Matches a fencer's name or club.
  const nameOf = (competitorId: string) => {
    const fencer = pool.fencers.find((f) => f.competitor_id === competitorId);
    return fencer ? `${fencerName(fencer)} ${fencer.team}`.toLowerCase() : "";
  };

  return pool.bouts.filter(
    (bout) =>
      (statuses.length === 0 || statuses.includes(bout.status)) &&
      (!query || nameOf(bout.competitor_1_id).includes(query) || nameOf(bout.competitor_2_id).includes(query)),
  );
}
