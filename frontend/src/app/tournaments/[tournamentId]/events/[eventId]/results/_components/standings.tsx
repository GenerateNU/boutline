import { Section } from "@/components/primitives/section";
import type { PoolStanding } from "../../_types/results";
import { ResultRow } from "./result-row";

type StandingsRow = { standing: PoolStanding; place?: number };

interface StandingsGroup {
  title?: string;
  rows: StandingsRow[];
}

interface StandingsProps {
  groups: StandingsGroup[];
  emptyMessage: string;
  fencerBasePath: string;
  summary?: React.ReactNode;
}

function ResultList({ rows, fencerBasePath }: { rows: StandingsRow[]; fencerBasePath: string }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map(({ standing, place }) => (
        <li key={standing.fencer.id}>
          <ResultRow
            standing={standing}
            place={place}
            fencerHref={`${fencerBasePath}/${standing.fencer.id}`}
          />
        </li>
      ))}
    </ul>
  );
}

function Standings({ groups, emptyMessage, fencerBasePath, summary }: StandingsProps) {
  const filled = groups.filter(({ rows }) => rows.length > 0);
  if (filled.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-10">
      {summary}
      {filled.map(({ title, rows }) => {
        const list = <ResultList rows={rows} fencerBasePath={fencerBasePath} />;
        return title ? (
          <Section key={title} title={title}>
            {list}
          </Section>
        ) : (
          <div key="untitled">{list}</div>
        );
      })}
    </div>
  );
}

export { Standings };
