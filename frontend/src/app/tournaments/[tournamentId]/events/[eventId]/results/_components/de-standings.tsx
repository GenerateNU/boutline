import type { FinalPlacing } from "../../_types/results";
import { ResultList } from "./result-list";

interface DeStandingsProps {
  placings: FinalPlacing[];
  fencerBasePath: string;
}

function DeStandings({ placings, fencerBasePath }: DeStandingsProps) {
  if (placings.length === 0) {
    return <p className="text-sm text-muted-foreground">No placings until the final ends.</p>;
  }

  return <ResultList rows={placings} fencerBasePath={fencerBasePath} />;
}

export { DeStandings };
