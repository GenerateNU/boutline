
import { Background } from "@/components/primitives/background";
import { Section } from "@/components/primitives/section";
import { Text } from "@/components/primitives/text";
import { EventStatusBadge } from "@/features/event/components/event-status-badge";
import { MAX_FENCERS_PER_POOL } from "@/features/pool/lib/pool-limits";
import { getEventPools } from "@/features/pool/services/get-event-pools";
import { EndPoolStageButton } from "@/features/pool-stage/components/end-pool-stage-button";
import { getEventPoolStage } from "@/features/pool-stage/services/get-event-pool-stage";
import { getTournament } from "@/features/tournament/services/getTournament";
import { getTournamentRole } from "@/features/tournament/services/getTournamentRole";
import { readStringParam } from "@/lib/search-params";

import { DirectEliminationSection } from "../_components/direct-elimination-section";
import { EditModeLink } from "../_components/edit-mode-link";
import { AddPoolSheet } from "./_components/add-pool-sheet";
import { AdminPoolList } from "./_components/admin-pool-list";


export default async function PoolingTab({
  params,
  searchParams,
}: PageProps<"/admin/tournaments/[tournamentId]/events/[eventId]">) {
  const [{ tournamentId, eventId }, query] = await Promise.all([params, searchParams]);
  const [poolStage, role, pools, tournament] = await Promise.all([
    getEventPoolStage(eventId),
    getTournamentRole(tournamentId),
    getEventPools(eventId),
    getTournament(tournamentId),
  ]);
  // The layout lets referees in to look; the backend refuses them anyway, so this only hides buttons they can't use.
  const canManage = role === "admin";
  const editing = canManage && readStringParam(query, "edit") === "1";
  const stageOpen = !poolStage || poolStage.status === "upcoming";
  const maxFencers = Math.min(poolStage?.max_competitor_per_pool ?? MAX_FENCERS_PER_POOL, MAX_FENCERS_PER_POOL);
  const nextNumber = pools.reduce((max, pool) => Math.max(max, pool.number), 0) + 1;
  const eventPath = `/admin/tournaments/${tournamentId}/events/${eventId}`;
  // The backend only accepts new pools in an active tournament whose pool stage hasn't started.
  const addBlockedReason =
    tournament?.status !== "active"
      ? "Pools can be added once the tournament is active."
      : !stageOpen
        ? "Pools can only be added before the pool stage starts."
        : null;

  return (
    <div className="flex flex-col gap-10">
      <Background version={6} className="opacity-50" />
      <div className="flex flex-col gap-4">
        {canManage && (
          <div className="flex items-center gap-3">
            {!editing && (
              <AddPoolSheet
                tournamentId={tournamentId}
                eventId={eventId}
                poolStageId={poolStage?.id ?? null}
                maxFencers={maxFencers}
                nextNumber={nextNumber}
                excludedIds={pools.flatMap((pool) => pool.fencers.map((fencer) => fencer.competitor_id))}
                disabled={addBlockedReason !== null}
              />
            )}
            {pools.length > 0 && (
              <EditModeLink editing={editing} path={eventPath} variant="outline" />
            )}
          </div>
        )}
        {canManage && !editing && addBlockedReason && <Text variant="muted">{addBlockedReason}</Text>}
        {pools.length === 0 ? (
          <Text variant="muted">No pools yet.</Text>
        ) : (
          <AdminPoolList
            pools={pools}
            editing={editing}
            poolsPath={`${eventPath}/pools`}
            tournamentId={tournamentId}
            eventId={eventId}
            maxFencers={maxFencers}
          />
        )}
      </div>

      <Section title="Pool stage">
        {poolStage ? (
          <>
            <EventStatusBadge status={poolStage.status} className="self-start" />
            {canManage && poolStage.status === "active" && (
              <EndPoolStageButton poolStageId={poolStage.id} />
            )}
          </>
        ) : (
          <Text variant="muted">This event has no pool stage.</Text>
        )}
      </Section>

      {poolStage?.status === "ended" && (
        <DirectEliminationSection
          tournamentId={tournamentId}
          eventId={eventId}
          canManage={canManage}
        />
      )}
    </div>
  );
}
