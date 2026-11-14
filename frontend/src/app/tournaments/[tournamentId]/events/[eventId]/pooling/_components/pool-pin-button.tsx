"use client";

import PushPin from "@mui/icons-material/PushPin";
import PushPinOutlined from "@mui/icons-material/PushPinOutlined";
import { cn } from "cn";

import { PinButton } from "@/components/primitives/pin-button";
import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";

import { poolTitle } from "../_services/pool-title";
import type { PoolBoard } from "../_types/pool-board";

interface PoolPinButtonProps {
  pool: PoolBoard;
  className?: string;
}

export function PoolPinButton({ pool, className }: PoolPinButtonProps) {
  const { pinned, pinPool, unpinPool } = usePinnedItems();
  const isPinned = pinned.poolIds.includes(pool.id);
  const PinIcon = isPinned ? PushPin : PushPinOutlined;

  return (
    <PinButton
      variant="plain"
      size="xs"
      active={isPinned}
      aria-label={`${isPinned ? "Unpin" : "Pin"} ${poolTitle(pool)}`}
      onClick={() => (isPinned ? unpinPool(pool.id) : pinPool(pool.id))}
      className={cn("[&_svg]:size-5", className)}
    >
      <PinIcon aria-hidden />
    </PinButton>
  );
}
