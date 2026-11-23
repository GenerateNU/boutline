import type { BoutStatus } from "@/types/bout";

export interface FencerBout {
  id: string;
  // Set for a pool bout, so the pool itself can be loaded.
  poolId: string | null;
  stage: string;
  opponent: string;
  status: BoutStatus;
  score: [number, number] | null;
}
