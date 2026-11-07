import { useMemo, useSyncExternalStore } from "react";

import {
  parsePinnedPools,
  readPinnedPools,
  subscribePinnedPools,
  writePinnedPools,
} from "../_services/pinned-pools-store";

export function usePinnedPools(eventId: string) {
  // The snapshot is the raw string so React sees a stable value between renders.
  const raw = useSyncExternalStore(
    subscribePinnedPools,
    () => readPinnedPools(eventId),
    () => null,
  );
  const pinnedIds: ReadonlySet<string> = useMemo(() => new Set(parsePinnedPools(raw)), [raw]);

  const togglePinned = (poolId: string) => {
    const next = new Set(pinnedIds);
    if (!next.delete(poolId)) {
      next.add(poolId);
    }
    writePinnedPools(eventId, [...next]);
  };

  return { pinnedIds, togglePinned };
}
