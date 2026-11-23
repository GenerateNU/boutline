import { notFound } from "next/navigation";

import { getEvent } from "@/features/event/services/getEvent";
import { EndPoolStageButton } from "@/features/pool-stage/components/end-pool-stage-button";
import { getEventPoolStage } from "@/features/pool-stage/services/get-event-pool-stage";
import { getTournamentRole } from "@/features/tournament/services/getTournamentRole";
import { EventTabBackground } from "../_components/event-tab-background";
import { getPoolStageResults } from "../_services/results";
import { ResultsView } from "./_components/results-view";

interface ResultsTabProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/results"> {}

export default async function ResultsTab({ params }: ResultsTabProps) {
  const { tournamentId, eventId } = await params;
  const [role, poolStage, fencers, event] = await Promise.all([
    getTournamentRole(tournamentId),
    getEventPoolStage(eventId),
    getPoolStageResults(eventId),
    getEvent(eventId),
  ]);
  if (!event) {
    notFound();
  }
  // The backend refuses non-admins anyway; this only hides a button they can't use.
  const endPoolStage = role === "admin" && poolStage?.status === "active" && (
    <EndPoolStageButton
      poolStageId={poolStage.id}
      redirectTo={`/admin/tournaments/${tournamentId}/events/${eventId}`}
    />
  );

  return (
    <div className="relative isolate -mx-4 -mb-20 min-h-[calc(100dvh-12.5rem)] overflow-clip bg-fencing-white px-4 pt-4 pb-20">
      <EventTabBackground />
      <ResultsView
        fencers={fencers}
        eventName={event.name}
        eventStatus={event.status}
        action={endPoolStage}
      />
    </div>
  );
}
