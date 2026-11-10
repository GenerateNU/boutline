"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";
import { fetchPinnedItems } from "@/features/pinning/services/pinned-items-query";
import type { PinnedItems } from "@/features/pinning/types/pinning";
import { errorMessage } from "@/utils/error-message";

interface Settled {
  items: PinnedItems | null;
  error: string | null;
}

interface PinnedItemsQuery extends Settled {
  unpinFencer: (id: string) => void;
}

const subscribe = () => () => {};

// items and error both null means loading. With a tournamentId, only that
// tournament's pins come back; pins are stored for every tournament together.
function usePinnedItemsQuery(tournamentId?: string): PinnedItemsQuery {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const { pinned, unpinFencer } = usePinnedItems();
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    let ignore = false;
    fetchPinnedItems(pinned).then(
      (items) => {
        if (!ignore) {
          setSettled({ items, error: null });
        }
      },
      (caught) => {
        if (!ignore) {
          setSettled({ items: null, error: errorMessage(caught) });
        }
      },
    );
    return () => {
      ignore = true;
    };
  }, [hydrated, pinned]);

  if (!hydrated || !settled) {
    return { items: null, error: null, unpinFencer };
  }
  // While a refetch is in flight the last result stays on screen, minus anything
  // unpinned since, so unpinning removes one card instead of reloading the list.
  const items = settled.items && {
    fencers: settled.items.fencers.filter(
      (fencer) =>
        pinned.fencerIds.includes(fencer.id) &&
        (!tournamentId || fencer.tournamentId === tournamentId),
    ),
  };
  return { items, error: settled.error, unpinFencer };
}

export { usePinnedItemsQuery };
