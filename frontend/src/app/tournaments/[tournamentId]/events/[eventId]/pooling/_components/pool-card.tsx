"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Collapsible } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
import { SegmentedButton, SegmentedButtonItem } from "@/components/primitives/segmented-button";

import { boutsTable, standingsTable } from "../_services/pool-table-data";
import { poolTitle } from "../_services/pool-title";
import type { PoolBoard } from "../_types/pool-board";
import type { PoolView } from "../_types/pool-table";

import { PoolStatusBadge } from "./pool-status-badge";
import { PoolTable } from "./pool-table";

interface PoolCardProps {
  pool: PoolBoard;
  poolingPath: string;
}

const viewItemClass =
  "h-10 border-brand bg-background py-0 text-brand data-[state=on]:bg-brand-muted data-[state=on]:text-brand";

export function PoolCard({ pool, poolingPath }: PoolCardProps) {
  const [view, setView] = useState<PoolView>("bouts");
  const title = poolTitle(pool);

  return (
    <Collapsible.Root defaultOpen className="flex flex-col gap-5 rounded-md border border-foreground bg-neutral-200 p-4">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 text-xl leading-6 font-medium">{title}</h3>
        <PoolStatusBadge status={pool.status} />
        <Collapsible.Trigger
          aria-label={title}
          className="group flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown aria-hidden className="size-5 transition-transform group-data-[state=open]:rotate-180" />
        </Collapsible.Trigger>
      </div>
      <Collapsible.Content className="flex flex-col gap-5">
        <SegmentedButton
          type="single"
          value={view}
          // Radix reports "" when the active item is clicked again; keep the current view.
          onValueChange={(value) => value && setView(value as PoolView)}
          aria-label={`${title} view`}
          className="flex w-full rounded-md border-brand"
        >
          <SegmentedButtonItem value="bouts" className={viewItemClass}>
            Bouts
          </SegmentedButtonItem>
          <SegmentedButtonItem value="standings" className={viewItemClass}>
            Standings
          </SegmentedButtonItem>
        </SegmentedButton>
        <PoolTable
          caption={`${title} ${view}`}
          view={view}
          data={view === "bouts" ? boutsTable(pool) : standingsTable(pool)}
        />
        <Button asChild variant="outline" className="w-full rounded-sm border-brand bg-background font-normal text-brand">
          <Link href={`${poolingPath}/${pool.id}`}>View Pool</Link>
        </Button>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
