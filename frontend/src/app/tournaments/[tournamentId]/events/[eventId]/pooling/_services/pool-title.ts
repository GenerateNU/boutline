import { PoolBoard } from "@/features/pool/types/pool-board";

export function poolTitle(pool: PoolBoard): string {
  return pool.strip ? `Pool ${pool.number} · ${pool.strip}` : `Pool ${pool.number}`;
}
