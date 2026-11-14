import { PoolList } from "./_components/pool-list";
import { getEventPools } from "./_services/get-event-pools";

interface PoolingTabProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/pooling"> {}

export default async function PoolingTab({ params }: PoolingTabProps) {
  const { tournamentId, eventId } = await params;
  const pools = await getEventPools(eventId);

  return (
    <PoolList
      pools={pools}
      poolingPath={`/tournaments/${tournamentId}/events/${eventId}/pooling`}
    />
  );
}
