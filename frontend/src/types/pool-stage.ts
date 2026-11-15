import { ListResponse } from "@/types/list-response";

export type PoolStageStatus = "upcoming" | "active" | "ended";

export interface PoolStage {
  id: string;
  event_id: string;
  max_competitor_per_pool: number;
  status: PoolStageStatus;
  start_time: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PoolStageListResult = ListResponse<PoolStage>;
