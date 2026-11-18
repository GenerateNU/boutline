import { Section } from "@/components/primitives/section";
import type { PoolStanding } from "../../_types/results";
import { ResultList } from "./result-list";

interface PoolStandingsProps {
  standings: PoolStanding[];
  fencerBasePath: string;
}

function PoolStandings({ standings, fencerBasePath }: PoolStandingsProps) {
  if (standings.length === 0) {
    return <p className="text-sm text-muted-foreground">No pool results yet.</p>;
  }

  const qualifiers = standings
    .filter(({ advanced }) => advanced)
    .map((standing) => ({ standing }));
  const eliminated = standings
    .filter(({ advanced }) => !advanced)
    .map((standing) => ({ standing }));

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <p className="text-sm">
          {qualifiers.length} Qualifiers · {eliminated.length} Eliminated
        </p>
        <div className="self-start rounded-md border border-foreground px-3 py-2">
          <p className="font-mono text-xl font-medium">
            {Math.round((qualifiers.length / standings.length) * 100)} %
          </p>
          <p className="text-xs text-muted-foreground">of fencers qualified</p>
        </div>
      </div>

      {qualifiers.length > 0 && (
        <Section title="Qualifiers">
          <ResultList rows={qualifiers} fencerBasePath={fencerBasePath} />
        </Section>
      )}
      {eliminated.length > 0 && (
        <Section title="Eliminated">
          <ResultList rows={eliminated} fencerBasePath={fencerBasePath} />
        </Section>
      )}
    </div>
  );
}

export { PoolStandings };
