import type { PoolBoard, PoolBout, PoolFencer } from "../_types/pool-board";
import type { PoolBoutDetail, PoolBoutSide } from "../_types/pool-bout-detail";

import { fencerName } from "./fencer-name";

function boutSide(bout: PoolBout, fencer: PoolFencer, score: number): PoolBoutSide {
  const decided = bout.winner_id !== null;
  return {
    competitorId: fencer.competitor_id,
    name: fencerName(fencer),
    team: fencer.team,
    score: bout.status === "upcoming" ? null : score,
    result: decided ? (bout.winner_id === fencer.competitor_id ? "V" : "D") : null,
  };
}

export function poolBoutDetail(pool: PoolBoard, boutId: string): PoolBoutDetail | null {
  const bout = pool.bouts.find((b) => b.id === boutId);
  if (!bout) {
    return null;
  }
  const first = pool.fencers.find((f) => f.competitor_id === bout.competitor_1_id);
  const second = pool.fencers.find((f) => f.competitor_id === bout.competitor_2_id);
  if (!first || !second) {
    return null;
  }

  const sides: [PoolBoutSide, PoolBoutSide] = [
    boutSide(bout, first, bout.competitor_1_score),
    boutSide(bout, second, bout.competitor_2_score),
  ];
  return {
    id: bout.id,
    number: bout.slot,
    total: pool.bouts.length,
    status: bout.status,
    sides,
    poolNumber: pool.number,
    strip: (bout.location ?? pool.strip)?.replace(/^Strip\s+/, "") ?? null,
  };
}
