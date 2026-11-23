"use client";

import { useCallback, useMemo } from "react";
import { useSessionStorage } from "@/lib/hooks/use-session-storage";
import { parsePinnedItems } from "@/features/pinning/services/parse-pinned-items";
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

const INITIAL_PINNED: PinnedItems = { fencerIds: [], clubs: [], pools: [], tableaus: [] };

const FIELD_OF_KIND = {
  fencer: "fencerIds",
  club: "clubs",
  pool: "pools",
  tableau: "tableaus",
} as const satisfies Record<PinKind, keyof PinnedItems>;

function isSameItem(kind: PinKind, a: unknown, b: unknown): boolean {
  switch (kind) {
    case "fencer":
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
