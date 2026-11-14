import { BackButton } from "@/components/primitives/back-button";
import { Section } from "@/components/primitives/section";
import { EventStatusBadge } from "@/features/event/components/event-status-badge";

import { DirectEliminationSection } from "./_components/direct-elimination-section";
import { EndPoolStageButton } from "./_components/end-pool-stage-button";
import { getEventPoolStage } from "./_services/get-event-pool-stage";

export default async function AdminEventPage({
  params,
}: PageProps<"/admin/tournaments/[tournamentId]/events/[eventId]">) {
  const { tournamentId, eventId } = await params;
  const poolStage = await getEventPoolStage(eventId);

  return (
    <div className="flex flex-col gap-10">
      <BackButton href={`/tournaments/${tournamentId}/events/${eventId}`} />

      <Section title="Pool stage">
        {poolStage ? (
          <>
            <EventStatusBadge status={poolStage.status} />
            {poolStage.status === "active" && <EndPoolStageButton poolStageId={poolStage.id} />}
          </>
        ) : (
          <p className="text-sm text-neutral-secondary">This event has no pool stage.</p>
        )}
      </Section>

      {poolStage?.status === "ended" && <DirectEliminationSection eventId={eventId} />}
    </div>
  );
}
