import { PoolList } from "./_components/pool-list";
import { poolBoards } from "./_services/pools";

interface PoolingTabProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/pooling"> {}

export default async function PoolingTab({ params }: PoolingTabProps) {
  const { tournamentId, eventId } = await params;

  return (
    <PoolList
      pools={poolBoards}
      eventId={eventId}
      poolingPath={`/tournaments/${tournamentId}/events/${eventId}/pooling`}
    />
  );
}
