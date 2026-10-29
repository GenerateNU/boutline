import { BoutStatus } from "@/types/bout";

export type PoolStatus = "upcoming" | "active" | "ended";

export interface PoolStanding {
  place: number;
  victories: number;
  matches: number;
  victory_ratio: number;
  touches_scored: number;
  touches_received: number;
  indicator: number;
}

export interface PoolFencer {
  competitor_id: string;
  position: number;
  first_name: string;
  last_name: string;
  team: string;
  standing: PoolStanding;
}

export interface PoolBout {
  id: string;
  status: BoutStatus;
  competitor_1_id: string;
  competitor_2_id: string;
  competitor_1_score: number;
  competitor_2_score: number;
  winner_id: string | null;
  location: string | null;
  start_time: string | null;
}

export interface PoolBoard {
  id: string;
  pool_stage_id: string;
  number: number;
  strip: string; // "Strip 3"
  status: PoolStatus;
  start_time: string | null;
  started_at: string | null;
  completed_at: string | null;
  fencers: PoolFencer[];
  bouts: PoolBout[];
}
