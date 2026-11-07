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

function boutSummary(bout: PoolBout, [first, second]: [PoolBoutSide, PoolBoutSide]): string {
  const winner = first.result === "V" ? first : second.result === "V" ? second : null;
  if (winner) {
    const loser = winner === first ? second : first;
    return `${winner.name} won ${winner.score}-${loser.score}`;
  }
  return bout.status === "active" ? `In progress, ${first.score}-${second.score}` : "Not fenced yet";
}

export function poolBoutDetail(pool: PoolBoard, boutId: string): PoolBoutDetail | null {
  const index = pool.bouts.findIndex((b) => b.id === boutId);
  if (index === -1) {
    return null;
  }
  const bout = pool.bouts[index];
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
    number: index + 1,
    total: pool.bouts.length,
    status: bout.status,
    sides,
    summary: boutSummary(bout, sides),
    poolNumber: pool.number,
    strip: (bout.location ?? pool.strip).replace(/^Strip\s+/, ""),
  };
}
