import { notFound } from "next/navigation";

import { getEvent } from "@/features/event/services/getEvent";
import type { PinnedEvent } from "@/features/pinning/types/pinning";

import { PoolList } from "./_components/pool-list";
import { getEventPools } from "./_services/get-event-pools";

interface PoolingTabProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/pooling"> {}

export default async function PoolingTab({ params }: PoolingTabProps) {
  const { tournamentId, eventId } = await params;
  const [pools, event] = await Promise.all([getEventPools(eventId), getEvent(eventId)]);
  if (!event) {
notFound();
}

  const pinnedEvent: PinnedEvent = { tournamentId, eventId, eventName: event.name };

  return (
    <PoolList
      pools={pools}
      poolingPath={`/tournaments/${tournamentId}/events/${eventId}/pooling`}
      event={pinnedEvent}
    />
  );
}
