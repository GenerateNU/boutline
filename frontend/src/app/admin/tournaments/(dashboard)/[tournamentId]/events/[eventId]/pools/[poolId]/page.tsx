import { notFound } from "next/navigation";

import { BackButton } from "@/components/primitives/back-button";
import { Text } from "@/components/primitives/text";
import { getPool } from "@/features/pool/services/get-pool";
import { getEventPoolStage } from "@/features/pool-stage/services/get-event-pool-stage";
import { getTournamentRole } from "@/features/tournament/services/getTournamentRole";
import { readStringParam } from "@/lib/search-params";

import { PoolBoutBoard } from "./_components/pool-bout-board";

export default async function AdminPoolPage({
  params,
  searchParams,
}: PageProps<"/admin/tournaments/[tournamentId]/events/[eventId]/pools/[poolId]">) {
  const { tournamentId, eventId, poolId } = await params;
  const query = await searchParams;
  const [pool, stage, role] = await Promise.all([
    getPool(poolId),
    getEventPoolStage(eventId),
    getTournamentRole(tournamentId),
  ]);

  if (!pool || pool.pool_stage_id !== stage?.id) {
    notFound();
  }

  const eventPath = `/admin/tournaments/${tournamentId}/events/${eventId}`;
  const poolPath = `${eventPath}/pools/${poolId}`;
  // The layout lets referees in to look; the backend refuses them anyway, so this only hides buttons they can't use.
  const canManage = role === "admin";
  const editing = canManage && readStringParam(query, "edit") === "1";

  return (
    <div className="flex flex-col gap-6 font-manrope">
      <div className="flex flex-col gap-3">
        <BackButton href={eventPath} aria-label="Back to Pools">
          Pools
        </BackButton>
        <Text as="h1" variant="heading">
          Pool {pool.number}
        </Text>
      </div>
      <PoolBoutBoard
        pool={pool}
        editing={editing}
        canManage={canManage}
        editHref={`${poolPath}?edit=1`}
        exitHref={poolPath}
        refereeBasePath={`/tournaments/${tournamentId}/events/${eventId}/bout`}
      />
    </div>
  );
}
