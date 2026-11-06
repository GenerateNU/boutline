import type { FinalPlacing } from "../../_types/results";
import { ResultRow } from "./result-row";

interface FinalStandingsProps {
  placings: FinalPlacing[];
  fencerBasePath: string;
}

function FinalStandings({ placings, fencerBasePath }: FinalStandingsProps) {
  return (
    <ul className="flex flex-col gap-3">
      {placings.map(({ place, standing }) => (
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

export { FinalStandings };
