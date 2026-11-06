import type { PoolStanding } from "../../_types/results";
import { ResultRow } from "./result-row";

interface ResultListRow {
  standing: PoolStanding;
  place?: number;
}

interface ResultListProps {
  rows: ResultListRow[];
  fencerBasePath: string;
}

function ResultList({ rows, fencerBasePath }: ResultListProps) {
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

export { ResultList };
