import type { BoutStatus } from "@/types/bout";

import type { PoolBoard, PoolBout, PoolFencer, PoolStanding, PoolStatus } from "../_types/pool-board";

// Test-only: builds a pool sheet in the API's shape from just the fields a test cares about.

type FencerSpec = [first: string, last: string, team: string, standing?: Partial<PoolStanding>];

// Fencers by 1-based position; an ended bout's winner is whoever scored more.
type BoutSpec = [first: number, second: number, score1: number, score2: number, status?: BoutStatus];

interface PoolSpec {
  number: number;
  strip?: string | null;
  status?: PoolStatus;
  start_time?: string | null;
  fencers: FencerSpec[];
  bouts?: BoutSpec[];
}

function fencer([first, last, team, standing]: FencerSpec, index: number): PoolFencer {
  return {
    competitor_id: `${first}-${last}`.toLowerCase(),
    position: index + 1,
    first_name: first,
    last_name: last,
    team,
    standing: {
      place: index + 1,
      victories: 0,
      matches: 0,
      victory_ratio: 0,
      touches_scored: 0,
      touches_received: 0,
      indicator: 0,
      ...standing,
    },
  };
}

export function buildPool({ number, strip = `Strip ${number}`, status = "active", start_time = null, fencers, bouts = [] }: PoolSpec): PoolBoard {
  const poolFencers = fencers.map(fencer);
  const poolBouts = bouts.map(([first, second, score1, score2, boutStatus = "ended"], index): PoolBout => {
    const [one, two] = [poolFencers[first - 1], poolFencers[second - 1]];
    return {
      id: `pool-${number}-bout-${index + 1}`,
      slot: index + 1,
      status: boutStatus,
      competitor_1_id: one.competitor_id,
      competitor_2_id: two.competitor_id,
      competitor_1_score: score1,
      competitor_2_score: score2,
      winner_id: boutStatus === "ended" ? (score1 > score2 ? one : two).competitor_id : null,
      location: null,
      start_time: null,
    };
  });

  return {
    id: `pool-${number}`,
    pool_stage_id: "stage",
    number,
    strip,
    status,
    start_time,
    started_at: null,
    completed_at: null,
    fencers: poolFencers,
    bouts: poolBouts,
  };
}
