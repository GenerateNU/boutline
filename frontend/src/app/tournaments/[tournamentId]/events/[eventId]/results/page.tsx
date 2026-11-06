import { Section } from "@/components/primitives/section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { getFinalPlacings, getPoolResults } from "../_services/results";
import { PoolStandings } from "./_components/pool-standings";
import { ResultRow } from "./_components/result-row";

interface ResultsTabProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/results"> {}

export default async function ResultsTab({ params }: ResultsTabProps) {
  const { tournamentId, eventId } = await params;
  const fencerBasePath = `/tournaments/${tournamentId}/events/${eventId}/fencers`;

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
          <PoolStandings standings={getPoolResults()} fencerBasePath={fencerBasePath} />
        </TabsContent>
        <TabsContent value="post-de" className="pt-2">
          <ul className="flex flex-col gap-3">
            {getFinalPlacings().map(({ place, standing }) => (
              <li key={standing.fencer.id}>
                <ResultRow
                  standing={standing}
                  place={place}
                  fencerHref={`${fencerBasePath}/${standing.fencer.id}`}
                />
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </Section>
  );
}
