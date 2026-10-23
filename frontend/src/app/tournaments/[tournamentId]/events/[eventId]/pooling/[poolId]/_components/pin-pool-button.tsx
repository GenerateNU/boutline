"use client";

import { Bookmark } from "lucide-react";

import { Button } from "@/components/primitives/button";

import { usePinnedPools } from "../../_hooks/use-pinned-pools";

interface PinPoolButtonProps {
  eventId: string;
  poolId: string;
}

export function PinPoolButton({ eventId, poolId }: PinPoolButtonProps) {
  const { pinnedIds, togglePinned } = usePinnedPools(eventId);
  const pinned = pinnedIds.has(poolId);

  return (
    <Button
      variant="text"
      size="icon"
      className="size-9"
      aria-label="Pin pool"
      aria-pressed={pinned}
      onClick={() => togglePinned(poolId)}
    >
      <Bookmark aria-hidden className="size-6" fill={pinned ? "currentColor" : "none"} />
    </Button>
  );
}
