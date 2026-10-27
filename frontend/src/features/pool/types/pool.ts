import type { Bout } from "@/types/bout";

export interface PoolStage {
  id: string;
  event_id: string;
}

export interface Pool {
  id: string;
  pool_stage_id: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface PoolBout extends Bout {
  pool_id: string | null;
  location: string | null;
}

export type PoolStatus = "upcoming" | "in_progress" | "finished";

export interface FencerPoolAssignment {
  poolNumber: number;
  strip: string | null;
  status: PoolStatus;
  fencerCount: number;
}
