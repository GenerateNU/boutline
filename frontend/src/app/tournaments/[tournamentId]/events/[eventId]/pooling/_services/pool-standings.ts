import type { PoolBoard } from "../_types/pool-board";
import type { PoolStandingRow } from "../_types/pool-standing-row";

import { fencerName } from "./fencer-name";

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function poolStandings(pool: PoolBoard): PoolStandingRow[] {
  return [...pool.fencers]
    .sort((a, b) => a.standing.place - b.standing.place || a.position - b.position)
    .map((fencer) => ({
      competitorId: fencer.competitor_id,
      place: fencer.standing.place,
      name: fencerName(fencer),
      team: fencer.team,
      victories: String(fencer.standing.victories),
      victoryRatio: fencer.standing.victory_ratio.toFixed(2),
      touchesScored: String(fencer.standing.touches_scored),
      touchesReceived: String(fencer.standing.touches_received),
      indicator: signed(fencer.standing.indicator),
    }));
}
