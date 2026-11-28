"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import type { PoolBoard } from "@/features/pool/types/pool-board";
import { fetchPinnedPools } from "@/features/pinning/services/pinned-pools-query";
import type { PinnedPool } from "@/features/pinning/types/pinning";
import { errorMessage } from "@/utils/error-message";

interface PinnedPoolEntry {
  pool: PoolBoard;
  pin: PinnedPool;
}

interface PinnedPools {
  pools: PinnedPoolEntry[] | null;
  error: string | null;
}

interface Settled {
  boards: PoolBoard[] | null;
  error: string | null;
}

const subscribe = () => () => {};

// pools and error both null means loading. Pools are fetched live, but the pin
// snapshot supplies the event they belong to, which the pool sheet doesn't carry.
function usePinnedPools(pins: PinnedPool[]): PinnedPools {
  // Same hydration gate as usePinnedFencers: pins aren't visible to the server render.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [settled, setSettled] = useState<Settled | null>(null);
  // Keyed on ids so toggling another kind of pin doesn't refetch the pools.
  const idsKey = pins.map(({ id }) => id).join(",");

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    let ignore = false;
    async function load() {
      try {
        const boards = await fetchPinnedPools(idsKey ? idsKey.split(",") : []);
        if (!ignore) {
          setSettled({ boards, error: null });
        }
      } catch (caught) {
        if (!ignore) {
          setSettled({ boards: null, error: errorMessage(caught) });
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [hydrated, idsKey]);

  if (!hydrated || !settled) {
    return { pools: null, error: null };
  }
  const { boards } = settled;
  if (!boards) {
    return { pools: null, error: settled.error };
  }
  // Pins dropped while a refetch is in flight leave at once; a pool the API no longer returns is omitted.
  const pools = pins.flatMap((pin) => {
    const pool = boards.find(({ id }) => id === pin.id);
    return pool ? [{ pool, pin }] : [];
  });
  return { pools, error: null };
}

export { usePinnedPools };
export type { PinnedPoolEntry };
