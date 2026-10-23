import { PoolBoard } from "../_types/pool-board";

export function poolTitle(pool: PoolBoard): string {
  return `Pool ${pool.number} - ${pool.strip}`;
}
