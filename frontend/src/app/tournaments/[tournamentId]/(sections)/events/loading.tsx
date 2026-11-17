"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { Card } from "@/components/primitives/card";
import { Skeleton } from "@/components/primitives/skeleton";
import { SearchForm } from "@/features/tournament/components/search-form";

const CARD_COUNT = 4;

export default function EventsLoading() {
  const pathname = usePathname();
  const search = useSearchParams().get("q") ?? "";

  return (
    <div className="flex flex-col gap-4">
      <span role="status" className="sr-only">
        Loading events
      </span>
      <div className="flex items-center gap-2.5">
        <SearchForm
          action={pathname}
          label="Search events"
          placeholder="Search events"
          defaultValue={search}
        />
        <Skeleton className="size-11.5 rounded-[12px]" />
      </div>

      <div className="flex flex-wrap items-center gap-x-1 gap-y-3">
        <Skeleton className="h-12 min-w-0 flex-1" />
        <Skeleton className="size-6 shrink-0" />
      </div>

      <Skeleton className="h-7 w-24" />

      <ul aria-hidden className="flex flex-col gap-3">
        {Array.from({ length: CARD_COUNT }, (_, index) => (
          <li key={index}>
            <Card orientation="horizontal" className="gap-3">
              <div className="grid min-w-0 flex-1 gap-1.5">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-5 w-10 shrink-0 rounded-sm" />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
