"use client";

import { useParams } from "next/navigation";

import { BackButton } from "@/components/primitives/back-button";
import { Skeleton } from "@/components/primitives/skeleton";
import { TabPageOnly } from "@/components/primitives/tab-page-only";
import { rememberedEventName, rememberedTournamentName } from "@/features/event/lib/remembered-names";

import { EventTabBody } from "./_components/event-tab-body";
import { EventTabNav } from "./_components/event-tab-nav";
import { EventTitle } from "./_components/event-title";
import { useEventTab } from "./_hooks/use-event-tab";
import { PoolPageSkeleton } from "./[eventId]/pooling/[poolId]/_components/pool-page-skeleton";
import { PoolsSkeleton } from "./[eventId]/pooling/_components/pools-skeleton";

// Sits above the event layout, so it covers every tab: the tabs and the event header are
// drawn in the loaded page's column, plus the pools or pool page skeleton under Pools so it
// doesn't pop in once the layout resolves. The names are real when this session has already seen them
// (from the list the user came from) and shimmer on a fresh load.
export default function EventLoading() {
  const { tournamentId, eventId } = useParams<{ tournamentId: string; eventId: string }>();
  const tournamentName = rememberedTournamentName(tournamentId);
  const eventName = rememberedEventName(eventId);
  const tab = useEventTab();
  const basePath = `/tournaments/${tournamentId}/events/${eventId}`;

  return (
    <div className="flex flex-col">
      <span role="status" className="sr-only">
        Loading event
      </span>
      <EventTabNav />
      <EventTabBody>
        <TabPageOnly basePath={basePath}>
          <div className="flex flex-col gap-1">
            {/* The shimmer is aria-hidden, so the link needs a name of its own until the tournament's is known. */}
            <BackButton
              href={`/tournaments/${tournamentId}`}
              aria-label={tournamentName ? undefined : "Back to tournament"}
              className="self-start"
            >
              {tournamentName ?? <Skeleton className="h-4 w-32" />}
            </BackButton>
            {eventName ? <EventTitle name={eventName} /> : <Skeleton className="h-8 w-56" />}
          </div>
        </TabPageOnly>
        {tab === "pooling" && (
          <TabPageOnly basePath={basePath} fallback={<PoolPageSkeleton />}>
            <PoolsSkeleton />
          </TabPageOnly>
        )}
      </EventTabBody>
    </div>
  );
}
