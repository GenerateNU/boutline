import { Section } from "@/components/primitives/section";
import type { PoolStanding } from "../../_types/results";
import { ResultRow } from "./result-row";

interface PoolStandingsProps {
  standings: PoolStanding[];
  fencerBasePath: string;
}

function PoolStandings({ standings, fencerBasePath }: PoolStandingsProps) {
  const qualifiers = standings.filter(({ advanced }) => advanced);
  const eliminated = standings.filter(({ advanced }) => !advanced);
  const groups = [
    { title: "Qualifiers", standings: qualifiers },
    { title: "Eliminated", standings: eliminated },
  ];

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

      {groups.map(
        ({ title, standings }) =>
          standings.length > 0 && (
            <Section key={title} title={title}>
              <ul className="flex flex-col gap-3">
                {standings.map((standing) => (
                  <li key={standing.fencer.id}>
                    <ResultRow
                      standing={standing}
                      fencerHref={`${fencerBasePath}/${standing.fencer.id}`}
                    />
                  </li>
                ))}
              </ul>
            </Section>
          ),
      )}
    </div>
  );
}

export { PoolStandings };
