"use client";

import { useParams } from "next/navigation";

import { BackButton } from "@/components/primitives/back-button";
import { Skeleton } from "@/components/primitives/skeleton";

import { EventTabNav } from "./_components/event-tab-nav";

// A client component so the back link can read the tournament id from the URL; loading
// screens get no route params. Mirrors EventHeader, with only the event's data shimmering.
export default function EventLoading() {
  const { tournamentId } = useParams<{ tournamentId: string }>();

  return (
    <div className="flex flex-col">
      <span role="status" className="sr-only">
        Loading event
      </span>
      <div className="flex flex-col gap-2 pb-2.5 font-manrope">
        <BackButton
          href={`/admin/tournaments/${tournamentId}/events`}
          size="sm"
          className="self-start pl-0"
        >
          All events
        </BackButton>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-neutral-secondary">Event Management Dashboard</p>
          <Skeleton className="h-5.5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-40" />
      </div>
      <EventTabNav />
    </div>
  );
}
