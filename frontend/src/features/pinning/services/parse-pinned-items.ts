import type { PinnedItems } from "@/features/pinning/types/pinning";

const NO_ITEMS: never[] = [];

// Stored arrays are returned by reference so unrelated fields keep their identity across writes.
// Legacy `{ fencerIds, boutIds, poolIds }` keeps only fencerIds: old pool ids carry no tournament.
function parsePinnedItems(value: unknown): PinnedItems {
  const { fencerIds, clubs, pools, tableaus } = (
    typeof value === "object" && value !== null ? value : {}
  ) as Record<string, unknown>;
  return {
    fencerIds: Array.isArray(fencerIds) ? fencerIds : NO_ITEMS,
    clubs: Array.isArray(clubs) ? clubs : NO_ITEMS,
    pools: Array.isArray(pools) ? pools : NO_ITEMS,
    tableaus: Array.isArray(tableaus) ? tableaus : NO_ITEMS,
  };
}

export { parsePinnedItems };
