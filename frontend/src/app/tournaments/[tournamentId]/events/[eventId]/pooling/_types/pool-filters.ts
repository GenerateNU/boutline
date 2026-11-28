import type { PoolStatus } from "@/features/pool/types/pool-board";

export type PoolSortKey = "number" | "start_time" | "strip";

export interface PoolFilters {
  fencer: string;
  club: string;
  status: PoolStatus | null;
  poolNumber: number | null;
  sort: PoolSortKey;
}

export interface PoolFilterOptions {
  fencers: string[];
  clubs: string[];
  poolNumbers: number[];
}
