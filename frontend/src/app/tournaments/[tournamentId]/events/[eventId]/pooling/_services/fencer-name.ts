import { PoolFencer } from "../_types/pool-board";

export function fencerName(fencer: PoolFencer): string {
  return `${fencer.first_name} ${fencer.last_name}`;
}
