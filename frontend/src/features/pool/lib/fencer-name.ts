import { PoolFencer } from "@/features/pool/types/pool-board";

export function fencerName(fencer: PoolFencer): string {
  return `${fencer.first_name} ${fencer.last_name}`;
}

// Grid and standings rows truncate long names, so the last name leads and the first name is what gets cut.
export function fencerListName(fencer: PoolFencer): string {
  return `${fencer.last_name}, ${fencer.first_name}`;
}
