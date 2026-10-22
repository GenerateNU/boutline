import { useState } from "react";

import { placeholderPinnedPoolIds } from "../_services/pools";

export function usePinnedPools() {
  const [pinnedIds, setPinnedIds] = useState<ReadonlySet<string>>(() => new Set(placeholderPinnedPoolIds));

  const togglePinned = (poolId: string) => {
    setPinnedIds((current) => {
      const next = new Set(current);
      if (!next.delete(poolId)) {
        next.add(poolId);
      }
      return next;
    });
  };

  return { pinnedIds, togglePinned };
}
