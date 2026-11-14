import type { PoolBoard } from "../_types/pool-board";
import type { PoolFilters, PoolSortKey } from "../_types/pool-filters";

import { fencerName } from "./fencer-name";

export const defaultPoolFilters: PoolFilters = {
  fencer: "",
  club: "",
  status: null,
  poolNumber: null,
  sort: "number",
};

// Pools missing the sort value (no start time, no strip) go last.
function nullsLast(a: string | null, b: string | null, compare: (a: string, b: string) => number): number {
  if (a === b) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  return b === null ? -1 : compare(a, b);
}

const comparators: Record<PoolSortKey, (a: PoolBoard, b: PoolBoard) => number> = {
  number: (a, b) => a.number - b.number,
  start_time: (a, b) => nullsLast(a.start_time, b.start_time, (x, y) => (x < y ? -1 : 1)),
  strip: (a, b) => nullsLast(a.strip, b.strip, (x, y) => x.localeCompare(y, undefined, { numeric: true })),
};

export function hasActiveFilters(filters: PoolFilters): boolean {
  return (
    filters.fencer.trim() !== "" ||
    filters.club.trim() !== "" ||
    filters.status !== null ||
    filters.poolNumber !== null
  );
}

export function applyPoolFilters(pools: PoolBoard[], filters: PoolFilters): PoolBoard[] {
  const fencer = filters.fencer.trim().toLowerCase();
  const club = filters.club.trim().toLowerCase();
  const compare = comparators[filters.sort];

  return pools
    .filter(
      (pool) =>
        (fencer === "" || pool.fencers.some((f) => fencerName(f).toLowerCase().includes(fencer))) &&
        (club === "" || pool.fencers.some((f) => f.team.toLowerCase().includes(club))) &&
        (filters.status === null || pool.status === filters.status) &&
        (filters.poolNumber === null || pool.number === filters.poolNumber),
    )
    .sort((a, b) => compare(a, b) || a.number - b.number);
}
