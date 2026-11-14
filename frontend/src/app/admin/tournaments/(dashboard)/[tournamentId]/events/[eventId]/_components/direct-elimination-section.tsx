import { Section } from "@/components/primitives/section";
import { EventStatusBadge } from "@/features/event/components/event-status-badge";

import { getEventDirectElimination } from "../_services/get-event-direct-elimination";
import { getTableauDrawn } from "../_services/get-tableau-drawn";
import { CreateDirectEliminationButton } from "./create-direct-elimination-button";
import { GenerateTableauForm } from "./generate-tableau-form";
import { StartDirectEliminationButton } from "./start-direct-elimination-button";

interface DirectEliminationSectionProps {
  tournamentId: string;
  eventId: string;
  canManage: boolean;
}

async function DirectEliminationSection({
  tournamentId,
  eventId,
  canManage,
}: DirectEliminationSectionProps) {
  const directElimination = await getEventDirectElimination(eventId);
  const drawn = directElimination ? await getTableauDrawn(eventId) : false;

  if (!directElimination) {
    return (
      <Section title="Direct elimination">
        {canManage ? (
          <CreateDirectEliminationButton eventId={eventId} />
        ) : (
          <p className="text-sm text-neutral-secondary">No direct elimination yet.</p>
        )}
      </Section>
    );
  }

  const canDraw = canManage && !drawn && directElimination.status === "upcoming";
  const canStart = canManage && drawn && directElimination.status === "upcoming";

  return (
    <Section title="Direct elimination">
      <EventStatusBadge status={directElimination.status} />
      {drawn && <p className="text-sm text-neutral-secondary">Tableau drawn.</p>}
      {canStart && <StartDirectEliminationButton directEliminationId={directElimination.id} />}
      {!canManage && !drawn && (
        <p className="text-sm text-neutral-secondary">Waiting for an admin to draw the tableau.</p>
      )}
      {canDraw && (
        <GenerateTableauForm
          directEliminationId={directElimination.id}
          tableauHref={`/tournaments/${tournamentId}/events/${eventId}/tableau`}
        />
      )}
    </Section>
  );
}

export { DirectEliminationSection };
