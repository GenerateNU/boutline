import { Section } from "@/components/primitives/section";
import { EventStatusBadge } from "@/features/event/components/event-status-badge";

import { getEventDirectElimination } from "../_services/get-event-direct-elimination";
import { getTableauDrawn } from "../_services/get-tableau-drawn";
import { CreateDirectEliminationButton } from "./create-direct-elimination-button";
import { GenerateTableauForm } from "./generate-tableau-form";

interface DirectEliminationSectionProps {
  tournamentId: string;
  eventId: string;
}

async function DirectEliminationSection({ tournamentId, eventId }: DirectEliminationSectionProps) {
  const directElimination = await getEventDirectElimination(eventId);
  const drawn = directElimination ? await getTableauDrawn(eventId) : false;

  return (
    <Section title="Direct elimination">
      {directElimination ? (
        <>
          <EventStatusBadge status={directElimination.status} />
          {drawn ? (
            <p className="text-sm text-neutral-secondary">Tableau drawn.</p>
          ) : (
            directElimination.status === "upcoming" && (
              <GenerateTableauForm
                directEliminationId={directElimination.id}
                tableauHref={`/tournaments/${tournamentId}/events/${eventId}/tableau`}
              />
            )
          )}
        </>
      ) : (
        <CreateDirectEliminationButton eventId={eventId} />
      )}
    </Section>
  );
}

export { DirectEliminationSection };
