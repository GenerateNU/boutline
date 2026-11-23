import type { ListResponse } from "@/types/list-response";

import type { PoolStanding } from "./pool-board";

export type PoolStageResultStatus = "pending" | "advanced" | "eliminated";

// One fencer as GET /api/v1/events/{id}/pool-stage-results returns them, in stage ranking order.
export interface PoolStageResult extends PoolStanding {
  competitor_id: string;
  first_name: string;
  last_name: string;
  club: string | null;
  pool_number: number;
  status: PoolStageResultStatus;
}

export type PoolStageResultList = ListResponse<PoolStageResult>;

export interface PoolStageResultFilters {
  status: PoolStageResultStatus | null;
  poolNumber: number | null;
}
