"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";
import { fetchPinnedFencers } from "@/features/pinning/services/pinned-items-query";
import type { Competitor } from "@/types/competitor";
import { errorMessage } from "@/utils/error-message";

interface Settled {
  fencers: Competitor[] | null;
  error: string | null;
}

interface PinnedFencers extends Settled {
  unpinFencer: (id: string) => void;
}

const subscribe = () => () => {};

// fencers and error both null means loading. With a tournamentId, only that
// tournament's pins come back; pins are stored for every tournament together.
function usePinnedFencers(tournamentId?: string): PinnedFencers {
  // Pins live in sessionStorage, which the server render can't see; waiting for
  // hydration keeps "No pinned fencers yet" from flashing before they load.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const { pinned, unpinFencer } = usePinnedItems();
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    let ignore = false;
    fetchPinnedFencers(pinned.fencerIds).then(
      (fencers) => {
        if (!ignore) {
          setSettled({ fencers, error: null });
        }
      },
      (caught) => {
        if (!ignore) {
          setSettled({ fencers: null, error: errorMessage(caught) });
        }
      },
    );
    return () => {
      ignore = true;
    };
  }, [hydrated, pinned.fencerIds]);

  if (!hydrated || !settled) {
    return { fencers: null, error: null, unpinFencer };
  }
  // While a refetch is in flight the last result stays on screen, minus anything
  // unpinned since, so unpinning removes one card instead of reloading the list.
  const fencers = settled.fencers?.filter(
    (fencer) =>
      pinned.fencerIds.includes(fencer.id) &&
      (!tournamentId || fencer.tournamentId === tournamentId),
  );
  return { fencers: fencers ?? null, error: settled.error, unpinFencer };
}

export { usePinnedFencers };
