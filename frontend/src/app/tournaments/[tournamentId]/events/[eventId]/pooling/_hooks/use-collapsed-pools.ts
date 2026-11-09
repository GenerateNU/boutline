import { useState } from "react";

export function useCollapsedPools() {
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(() => new Set());

  const setPoolOpen = (poolId: string, open: boolean) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (open) {
        next.delete(poolId);
      } else {
        next.add(poolId);
      }
      return next;
    });
  };

  const setAllOpen = (poolIds: string[], open: boolean) => {
    setCollapsedIds(open ? new Set() : new Set(poolIds));
  };

  return { collapsedIds, setPoolOpen, setAllOpen };
}
