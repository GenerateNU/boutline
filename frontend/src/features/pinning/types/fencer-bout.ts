import type { BoutStatus } from "@/types/bout";

export interface FencerBout {
  id: string;
  stage: string;
  opponent: string;
  status: BoutStatus;
  score: [number, number] | null;
}
