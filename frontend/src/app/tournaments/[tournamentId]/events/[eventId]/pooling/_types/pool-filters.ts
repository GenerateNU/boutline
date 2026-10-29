import type { PoolStatus } from "./pool-board";

export type PoolSortKey = "number" | "start_time" | "strip";

export interface PoolFilters {
  fencer: string;
  club: string;
  status: PoolStatus | null;
  poolNumber: number | null;
  sort: PoolSortKey;
}
