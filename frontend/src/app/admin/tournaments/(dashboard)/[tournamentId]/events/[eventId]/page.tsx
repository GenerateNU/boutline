import { BackButton } from "@/components/primitives/back-button";
import { Section } from "@/components/primitives/section";
import { EventStatusBadge } from "@/features/event/components/event-status-badge";
import { getEvent } from "@/features/event/services/getEvent";

import { EndPoolStageButton } from "@/features/pool-stage/components/end-pool-stage-button";
import { getEventPoolStage } from "@/features/pool-stage/services/get-event-pool-stage";
import { getTournamentRole } from "@/features/tournament/services/getTournamentRole";

import { DirectEliminationSection } from "./_components/direct-elimination-section";

export default async function AdminEventPage({
  params,
}: PageProps<"/admin/tournaments/[tournamentId]/events/[eventId]">) {
  const { tournamentId, eventId } = await params;
  const [poolStage, role, event] = await Promise.all([
    getEventPoolStage(eventId),
    getTournamentRole(tournamentId),
    // Only the back link's label needs the event, so a failed fetch falls back to "Event" rather than failing the page.
    getEvent(eventId).catch(() => null),
  ]);
  // The layout lets referees in to look; the backend refuses them anyway, so this only hides buttons they can't use.
  const canManage = role === "admin";

  return (
    <div className="flex flex-col gap-10">
      <BackButton href={`/tournaments/${tournamentId}/events/${eventId}`} className="self-start">
        {event?.name ?? "Event"}
      </BackButton>

      <Section title="Pool stage">
        {poolStage ? (
          <>
            <EventStatusBadge status={poolStage.status} />
            {canManage && poolStage.status === "active" && (
              <EndPoolStageButton poolStageId={poolStage.id} />
            )}
          </>
        ) : (
          <p className="text-sm text-neutral-secondary">This event has no pool stage.</p>
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
