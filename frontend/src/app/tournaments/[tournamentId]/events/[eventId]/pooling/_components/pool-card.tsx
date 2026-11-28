"use client";

import { cn } from "cn";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
import { SegmentedButton, SegmentedButtonItem } from "@/components/primitives/segmented-button";
import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";
import type { PinnedEvent } from "@/features/pinning/types/pinning";
import { PoolTable } from "@/features/pool/components/pool-table";

import { boutsTable } from "../_services/pool-table-data";
import { poolTitle } from "../_services/pool-title";
import type { PoolBoard } from "@/features/pool/types/pool-board";
import type { PoolView } from "../_types/pool-table";

import { PoolPinButton } from "./pool-pin-button";
import { PoolStandingsTable } from "./pool-standings-table";
import { PoolStatusBadge } from "@/features/pool/components/pool-status-badge";

interface PoolCardProps {
  pool: PoolBoard;
  poolingPath: string;
  event: PinnedEvent;
}

export const VIEW_ITEM_CLASS =
  "h-9 border-blue bg-card py-0 text-blue data-[state=on]:bg-blue data-[state=on]:text-white";

export function PoolCard({ pool, poolingPath, event }: PoolCardProps) {
  const { isPinned } = usePinnedItems();
  const [view, setView] = useState<PoolView>("bouts");
  const title = poolTitle(pool);
  const pinned = isPinned("pool", { ...event, id: pool.id });

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-[12px] border p-4 shadow-sm",
        pinned ? "border-blue-light bg-blue-lightest" : "border-outline bg-card",
      )}
    >
      <div className="flex items-center gap-2">
        <h3 className="flex-1 text-base font-medium">{title}</h3>
        <PoolStatusBadge status={pool.status} />
        <PoolPinButton pool={pool} event={event} className="-my-1 -mr-2" />
      </div>
      <SegmentedButton
        type="single"
        value={view}
        // Radix reports "" when the active item is clicked again; keep the current view.
        onValueChange={(value) => value && setView(value as PoolView)}
        aria-label={`${title} view`}
        className="flex w-full rounded-md border-blue"
      >
        <SegmentedButtonItem value="bouts" className={VIEW_ITEM_CLASS}>
          Bouts
        </SegmentedButtonItem>
        <SegmentedButtonItem value="standings" className={VIEW_ITEM_CLASS}>
          Standings
        </SegmentedButtonItem>
      </SegmentedButton>
      {view === "bouts" ? (
        <PoolTable caption={`${title} bouts`} data={boutsTable(pool)} />
      ) : (
        <PoolStandingsTable pool={pool} />
      )}
      <Button asChild variant="outline" className="w-full">
        <Link href={`${poolingPath}/${pool.id}`}>View pool</Link>
      </Button>
    </article>
  );
}
