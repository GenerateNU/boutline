import { notFound } from "next/navigation";

import { poolBoards } from "../_services/pools";

import { PoolBouts } from "./_components/pool-bouts";
import { PoolHeader } from "./_components/pool-header";

interface PoolPageProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/pooling/[poolId]"> {}

export default async function PoolPage({ params }: PoolPageProps) {
  const { tournamentId, eventId, poolId } = await params;
  const pool = poolBoards.find((p) => p.id === poolId);

  if (!pool) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <PoolHeader
        pool={pool}
        poolingPath={`/tournaments/${tournamentId}/events/${eventId}/pooling`}
      />
      <PoolBouts pool={pool} fencersPath={`/tournaments/${tournamentId}/events/${eventId}/fencers`} />
    </div>
  );
}
