import type { ResultStatus } from "./results";

export interface PoolStageResultResponse {
  competitor_id: string;
  first_name: string;
  last_name: string;
  club: string | null;
  rating: "A" | "B" | "C" | "D" | "E" | "U";
  rating_year: number | null;
  pool_number: number;
  strip: string | null;
  status: ResultStatus;
  place: number;
  victories: number;
  matches: number;
  victory_ratio: number;
  touches_scored: number;
  touches_received: number;
  indicator: number;
}

export interface PoolStageResultListResponse {
  data: PoolStageResultResponse[];
  total: number;
  limit: number;
  offset: number;
}
