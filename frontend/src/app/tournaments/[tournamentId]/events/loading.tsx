"use client";

import { useParams } from "next/navigation";

import { Skeleton } from "@/components/primitives/skeleton";
import { TabPageOnly } from "@/components/primitives/tab-page-only";

import { EventTabNav } from "./_components/event-tab-nav";

// Sits above the event layout, so it covers every tab: only the tabs and the event
// header are drawn, and each tab's own skeleton follows once the layout resolves.
export default function EventLoading() {
  const { tournamentId, eventId } = useParams<{ tournamentId: string; eventId: string }>();

  return (
    <div className="flex flex-col">
      <span role="status" className="sr-only">
        Loading event
      </span>
      <EventTabNav />
      <div className="mx-auto flex w-full max-w-mobile flex-col gap-4 px-4 pt-4 pb-20">
        <TabPageOnly basePath={`/tournaments/${tournamentId}/events/${eventId}`}>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-5 w-40 self-start" />
            <Skeleton className="h-8 w-56" />
          </div>
        </TabPageOnly>
      </div>
    </div>
  );
}
