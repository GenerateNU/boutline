// A client component, since a server one can't hand PoolSearch an onChange handler.
"use client";

import { Button } from "@/components/primitives/button";
import { SegmentedButton, SegmentedButtonItem } from "@/components/primitives/segmented-button";
import { Skeleton } from "@/components/primitives/skeleton";

import { VIEW_ITEM_CLASS } from "./pool-card";
import { PoolSearch } from "./pool-search";
import { PoolTableSkeleton } from "./pool-table-skeleton";

const CARD_COUNT = 2;
const NO_OPTIONS = { fencers: [], clubs: [], poolNumbers: [] };

function ignoreChange() {}

export function PoolListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <span role="status" className="sr-only">
        Loading pools
      </span>
      <div className="flex gap-2">
        <PoolSearch value="" onChange={ignoreChange} options={NO_OPTIONS} />
        <Skeleton className="size-11.5 rounded-[12px]" />
      </div>
      <ul aria-hidden className="flex flex-col gap-6">
        {Array.from({ length: CARD_COUNT }, (_, index) => (
          <li
            key={index}
            className="flex flex-col gap-4 rounded-[12px] border border-outline bg-card p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 flex-1" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="size-6 rounded-full" />
            </div>
            <SegmentedButton
              type="single"
              value="bouts"
              disabled
              className="flex w-full rounded-md border-blue"
            >
              <SegmentedButtonItem value="bouts" className={VIEW_ITEM_CLASS}>
                Bouts
              </SegmentedButtonItem>
              <SegmentedButtonItem value="standings" className={VIEW_ITEM_CLASS}>
                Standings
              </SegmentedButtonItem>
            </SegmentedButton>
            <PoolTableSkeleton />
            <Button variant="outline" disabled className="w-full">
              View pool
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
