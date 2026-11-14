"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
import { SegmentedButton, SegmentedButtonItem } from "@/components/primitives/segmented-button";

import { boutsTable } from "../_services/pool-table-data";
import { poolTitle } from "../_services/pool-title";
import type { PoolBoard } from "../_types/pool-board";
import type { PoolView } from "../_types/pool-table";

import { PoolStandingsTable } from "./pool-standings-table";
import { PoolStatusBadge } from "./pool-status-badge";
import { PoolTable } from "./pool-table";

interface PoolCardProps {
  pool: PoolBoard;
  poolingPath: string;
}

const viewItemClass =
  "h-9 border-blue bg-card py-0 text-blue data-[state=on]:bg-blue data-[state=on]:text-white";

export function PoolCard({ pool, poolingPath }: PoolCardProps) {
  const [view, setView] = useState<PoolView>("bouts");
  const title = poolTitle(pool);

  return (
    <article className="flex flex-col gap-4 rounded-[12px] border border-outline bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 text-base font-medium">{title}</h3>
        <PoolStatusBadge status={pool.status} />
      </div>
      <SegmentedButton
        type="single"
        value={view}
        // Radix reports "" when the active item is clicked again; keep the current view.
        onValueChange={(value) => value && setView(value as PoolView)}
        aria-label={`${title} view`}
        className="flex w-full rounded-md border-blue"
      >
        <SegmentedButtonItem value="bouts" className={viewItemClass}>
          Bouts
        </SegmentedButtonItem>
        <SegmentedButtonItem value="standings" className={viewItemClass}>
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
