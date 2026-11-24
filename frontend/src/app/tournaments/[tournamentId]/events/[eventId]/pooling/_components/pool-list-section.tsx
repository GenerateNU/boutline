import { getEventPools } from "../_services/get-event-pools";

import { PoolList } from "./pool-list";

interface PoolListSectionProps {
  tournamentId: string;
  eventId: string;
}

export async function PoolListSection({ tournamentId, eventId }: PoolListSectionProps) {
  return (
    <PoolList
      pools={await getEventPools(eventId)}
      poolingPath={`/tournaments/${tournamentId}/events/${eventId}/pooling`}
      event={{ tournamentId, eventId }}
    />
  );
}
