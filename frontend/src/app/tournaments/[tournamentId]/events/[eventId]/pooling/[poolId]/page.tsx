import { notFound } from "next/navigation";

import { getPool } from "../_services/get-pool";

import { PoolBouts } from "./_components/pool-bouts";
import { PoolHeader } from "./_components/pool-header";

interface PoolPageProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/pooling/[poolId]"> {}

export default async function PoolPage({ params }: PoolPageProps) {
  const { tournamentId, eventId, poolId } = await params;
  const pool = await getPool(poolId);

  if (!pool) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 font-manrope">
      <PoolHeader
        pool={pool}
        poolingPath={`/tournaments/${tournamentId}/events/${eventId}/pooling`}
      />
      <PoolBouts pool={pool} fencersPath={`/tournaments/${tournamentId}/events/${eventId}/fencers`} />
    </div>
  );
}
