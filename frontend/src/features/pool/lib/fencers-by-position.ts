import type { PoolBoard } from "@/features/pool/types/pool-board";

export function fencersByPosition({ fencers }: PoolBoard) {
  return fencers.toSorted((a, b) => a.position - b.position);
}
