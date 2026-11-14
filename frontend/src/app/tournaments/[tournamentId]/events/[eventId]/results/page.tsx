import { Section } from "@/components/primitives/section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { EndPoolStageButton } from "@/features/pool-stage/components/end-pool-stage-button";
import { getEventPoolStage } from "@/features/pool-stage/services/get-event-pool-stage";
import { getTournamentRole } from "@/features/tournament/services/getTournamentRole";
import { getFinalPlacings, getPoolResults } from "../_services/results";
import { DeStandings } from "./_components/de-standings";
import { PoolStandings } from "./_components/pool-standings";

interface ResultsTabProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/results"> {}

export default async function ResultsTab({ params }: ResultsTabProps) {
  const { tournamentId, eventId } = await params;
  const fencerBasePath = `/tournaments/${tournamentId}/events/${eventId}/fencers`;
  const [role, poolStage] = await Promise.all([
    getTournamentRole(tournamentId),
    getEventPoolStage(eventId),
  ]);
  // The backend refuses non-admins anyway; this only hides a button they can't use.
  const endPoolStage = role === "admin" && poolStage?.status === "active" && (
    <EndPoolStageButton
      poolStageId={poolStage.id}
      redirectTo={`/admin/tournaments/${tournamentId}/events/${eventId}`}
    />
  );

  return (
    <Section title="Results">
      <p className="text-sm text-muted-foreground">
        Placeholder results — the same for every event until the results API exists.
      </p>

      <Tabs defaultValue="post-pool">
        <TabsList>
          <TabsTrigger value="post-pool">Post-pool standings</TabsTrigger>
          <TabsTrigger value="post-de">Post-DE standings</TabsTrigger>
        </TabsList>
        <TabsContent value="post-pool" className="pt-2">
          <PoolStandings
            standings={getPoolResults()}
            fencerBasePath={fencerBasePath}
            action={endPoolStage}
          />
        </TabsContent>
        <TabsContent value="post-de" className="pt-2">
          <DeStandings placings={getFinalPlacings()} fencerBasePath={fencerBasePath} />
        </TabsContent>
      </Tabs>
    </Section>
  );
}
