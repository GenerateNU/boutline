"use client";

import PushPin from "@mui/icons-material/PushPin";
import PushPinOutlined from "@mui/icons-material/PushPinOutlined";
import { cn } from "cn";

import { PinButton } from "@/components/primitives/pin-button";
import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";
import type { PinnedEvent } from "@/features/pinning/types/pinning";

import { poolTitle } from "../_services/pool-title";
import type { PoolBoard } from "../_types/pool-board";

interface PoolPinButtonProps {
  pool: PoolBoard;
  event: PinnedEvent;
  className?: string;
}

export function PoolPinButton({ pool, event, className }: PoolPinButtonProps) {
  const { isPinned, togglePin } = usePinnedItems();
  const item = { ...event, id: pool.id, title: poolTitle(pool) };
  const pinned = isPinned("pool", item);
  const PinIcon = pinned ? PushPin : PushPinOutlined;

  return (
    <PinButton
      variant="plain"
      size="xs"
      active={pinned}
      aria-label={`${pinned ? "Unpin" : "Pin"} ${item.title}`}
      onClick={() => togglePin("pool", item)}
      className={cn("[&_svg]:size-5", className)}
    >
      <PinIcon aria-hidden />
    </PinButton>
  );
}
