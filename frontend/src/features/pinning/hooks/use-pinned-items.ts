"use client";

import { useCallback } from "react";
import { useSessionStorage } from "@/lib/hooks/use-session-storage";
import { PINNED_MAX_IDS, PINNED_STORAGE_KEY, PinnedIds } from "@/features/pinning/types/pinning";

const initialPinnedIds: PinnedIds = { fencerIds: [], matchIds: [] };

function pin(ids: string[], id: string): string[] {
  if (ids.includes(id) || ids.length >= PINNED_MAX_IDS) {
    return ids;
  }
  return [...ids, id];
}

function unpin(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : ids;
}

function usePinnedItems() {
  const [pinned, setPinned] = useSessionStorage<PinnedIds>(PINNED_STORAGE_KEY, initialPinnedIds);

  const pinFencer = useCallback(
    (id: string) => setPinned({ ...pinned, fencerIds: pin(pinned.fencerIds, id) }),
    [pinned, setPinned],
  );
  const unpinFencer = useCallback(
    (id: string) => setPinned({ ...pinned, fencerIds: unpin(pinned.fencerIds, id) }),
    [pinned, setPinned],
  );
  const pinMatch = useCallback(
    (id: string) => setPinned({ ...pinned, matchIds: pin(pinned.matchIds, id) }),
    [pinned, setPinned],
  );
  const unpinMatch = useCallback(
    (id: string) => setPinned({ ...pinned, matchIds: unpin(pinned.matchIds, id) }),
    [pinned, setPinned],
  );

  return { pinned, pinFencer, unpinFencer, pinMatch, unpinMatch };
}

export { usePinnedItems };
