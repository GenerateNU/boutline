"use client";

import { useParams } from "next/navigation";

import { BackButton } from "@/components/primitives/back-button";
import { Skeleton } from "@/components/primitives/skeleton";

import { PoolStandingsHead, STAT_COLUMNS } from "../_components/pool-standings-head";
import { PoolTableSkeleton } from "../_components/pool-table-skeleton";

const STANDINGS_ROW_COUNT = 6;

// A loading screen receives no params, so the back link reads them from the URL.
export default function PoolPageLoading() {
  const { tournamentId, eventId } = useParams<{ tournamentId: string; eventId: string }>();

  return (
    <div className="flex flex-col gap-6 font-manrope">
      <span role="status" className="sr-only">
        Loading pool
      </span>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <BackButton
            href={`/tournaments/${tournamentId}/events/${eventId}/pooling`}
            className="-ml-3"
          >
            <span className="sr-only">Back to </span>Pooling
          </BackButton>
          <Skeleton className="size-6 rounded-full" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-6 w-20 rounded-full" />
          <span aria-hidden className="size-1 rounded-full bg-neutral-muted" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <PoolTableSkeleton />
        <div className="overflow-hidden rounded-[12px] border border-outline bg-card">
          <table className="w-full border-collapse">
            <PoolStandingsHead />
            <tbody aria-hidden className="divide-y divide-outline">
              {Array.from({ length: STANDINGS_ROW_COUNT }, (_, index) => (
                <tr key={index}>
                  <td className="px-2 py-2">
                    <Skeleton className="h-4 w-4" />
                  </td>
                  <td className="w-full px-2 py-2">
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </td>
                  {STAT_COLUMNS.map((label) => (
                    <td key={label} className="px-2 py-2">
                      <Skeleton className="mx-auto h-4 w-5" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
