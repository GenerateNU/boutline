import type { BoutStatus } from "@/types/bout";

export interface PoolBoutSide {
  competitorId: string;
  name: string;
  position: number;
  team: string;
  score: number | null;
  result: "V" | "D" | null;
}

export interface PoolBoutDetail {
  id: string;
  number: number;
  total: number;
  status: BoutStatus;
  sides: [PoolBoutSide, PoolBoutSide];
  poolNumber: number;
  strip: string | null;
}
