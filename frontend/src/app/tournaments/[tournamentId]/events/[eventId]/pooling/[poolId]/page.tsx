import { notFound } from "next/navigation";

import { getEvent } from "@/features/event/services/getEvent";
import type { PinnedEvent } from "@/features/pinning/types/pinning";
import { getTournamentRole } from "@/features/tournament/services/getTournamentRole";

import { getPool } from "../_services/get-pool";

import { PoolBouts } from "./_components/pool-bouts";
import { PoolHeader } from "./_components/pool-header";

interface PoolPageProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/pooling/[poolId]"> {}

export default async function PoolPage({ params }: PoolPageProps) {
  const { tournamentId, eventId, poolId } = await params;
  const [pool, role, event] = await Promise.all([
    getPool(poolId),
    getTournamentRole(tournamentId),
    getEvent(eventId),
  ]);
  const eventPath = `/tournaments/${tournamentId}/events/${eventId}`;

  if (!pool || !event) {
    notFound();
  }

  const pinnedEvent: PinnedEvent = { tournamentId, eventId, eventName: event.name };

  return (
    <div className="flex flex-col gap-6 font-manrope">
      <PoolHeader
        pool={pool}
        poolingPath={`${eventPath}/pooling`}
        event={pinnedEvent}
      />
      {/* Any staff role sees the referee link; the backend decides who may actually score. */}
      <PoolBouts
        pool={pool}
        fencersPath={`${eventPath}/fencers`}
        boutsPath={`${eventPath}/bout`}
        canReferee={role !== null}
      />
    </div>
  );
}
