"use client";

import { useCallback, useMemo } from "react";
import { useSessionStorage } from "@/lib/hooks/use-session-storage";
import {
  PINNED_MAX_IDS,
  PINNED_STORAGE_KEY,
  PinKind,
  PinnedClub,
  PinnedItemOf,
  PinnedItems,
  PinnedPool,
  PinnedTableau,
} from "@/features/pinning/types/pinning";

const INITIAL_PINNED: PinnedItems = { fencerIds: [], boutIds: [], clubs: [], pools: [], tableaus: [] };
const NO_ITEMS: never[] = [];

// Stored arrays are returned by reference so unrelated fields keep their identity across writes.
// Legacy `{ fencerIds, boutIds, poolIds }` keeps its fencers and bouts: old pool ids carry no tournament.
function parsePinnedItems(value: unknown): PinnedItems {
  const { fencerIds, boutIds, clubs, pools, tableaus } = (
    typeof value === "object" && value !== null ? value : {}
  ) as Record<string, unknown>;
  return {
    fencerIds: Array.isArray(fencerIds) ? fencerIds : NO_ITEMS,
    boutIds: Array.isArray(boutIds) ? boutIds : NO_ITEMS,
    clubs: Array.isArray(clubs) ? clubs : NO_ITEMS,
    pools: Array.isArray(pools) ? pools : NO_ITEMS,
    tableaus: Array.isArray(tableaus) ? tableaus : NO_ITEMS,
  };
}

const FIELD_OF_KIND = {
  fencer: "fencerIds",
  bout: "boutIds",
  club: "clubs",
  pool: "pools",
  tableau: "tableaus",
} as const satisfies Record<PinKind, keyof PinnedItems>;

function isSameItem(kind: PinKind, a: unknown, b: unknown): boolean {
  switch (kind) {
    case "fencer":
    case "bout":
      return a === b;
    case "club":
      return (
        (a as PinnedClub).tournamentId === (b as PinnedClub).tournamentId &&
        (a as PinnedClub).name === (b as PinnedClub).name
      );
    case "pool":
      return (a as PinnedPool).id === (b as PinnedPool).id;
    case "tableau":
      return (a as PinnedTableau).eventId === (b as PinnedTableau).eventId;
  }
}

// TODO: nothing currently removes stale pinned IDs from the session storage (if they no longer
// exist in the database). Something to address once the pinning frontend is more clarified.
function usePinnedItems() {
  const [stored, setPinned] = useSessionStorage<unknown>(PINNED_STORAGE_KEY, INITIAL_PINNED);
  const pinned = useMemo(() => parsePinnedItems(stored), [stored]);

  const isPinned = useCallback(
    <K extends PinKind>(kind: K, item: PinnedItemOf[K]) =>
      (pinned[FIELD_OF_KIND[kind]] as unknown[]).some((existing) =>
        isSameItem(kind, existing, item),
      ),
    [pinned],
  );

  const togglePin = useCallback(
    <K extends PinKind>(kind: K, item: PinnedItemOf[K]) =>
      setPinned((current: unknown) => {
        const items = parsePinnedItems(current);
        const field = FIELD_OF_KIND[kind];
        const list = items[field] as unknown[];
        let next: unknown[];
        if (list.some((existing) => isSameItem(kind, existing, item))) {
          next = list.filter((existing) => !isSameItem(kind, existing, item));
        } else if (list.length >= PINNED_MAX_IDS) {
          next = list;
        } else {
          next = [...list, item];
        }
        return { ...items, [field]: next };
      }),
    [setPinned],
  );

  return { pinned, isPinned, togglePin };
}

export { usePinnedItems };
