import { Section } from "@/components/primitives/section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { getFinalPlacings, getPoolResults } from "../_services/results";
import { Standings } from "./_components/standings";

interface ResultsTabProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/results"> {}

export default async function ResultsTab({ params }: ResultsTabProps) {
  const { tournamentId, eventId } = await params;
  const fencerBasePath = `/tournaments/${tournamentId}/events/${eventId}/fencers`;

  const poolResults = getPoolResults();
  const qualifiers = poolResults.filter(({ advanced }) => advanced);
  const eliminated = poolResults.filter(({ advanced }) => !advanced);

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
          <Standings
            summary={
              <div className="flex flex-col gap-3">
                <p className="text-sm">
                  {qualifiers.length} Qualifiers · {eliminated.length} Eliminated
                </p>
                <div className="self-start rounded-md border border-foreground px-3 py-2">
                  <p className="font-mono text-xl font-medium">
                    {Math.round((qualifiers.length / poolResults.length) * 100)} %
                  </p>
                  <p className="text-xs text-muted-foreground">of fencers qualified</p>
                </div>
              </div>
            }
            groups={[
              { title: "Qualifiers", rows: qualifiers.map((standing) => ({ standing })) },
              { title: "Eliminated", rows: eliminated.map((standing) => ({ standing })) },
            ]}
            emptyMessage="No pool results yet."
            fencerBasePath={fencerBasePath}
          />
        </TabsContent>
        <TabsContent value="post-de" className="pt-2">
          <Standings
            groups={[{ rows: getFinalPlacings() }]}
            emptyMessage="No placings until the final ends."
            fencerBasePath={fencerBasePath}
          />
        </TabsContent>
      </Tabs>
    </Section>
  );
}
