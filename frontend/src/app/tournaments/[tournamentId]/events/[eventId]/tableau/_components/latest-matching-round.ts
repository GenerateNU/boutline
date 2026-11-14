import type { TableauRound } from "../../_types/tableau";
import { matchesQuery } from "./tableau-utils";

// The furthest-along round (e.g. semi-finals over table of 8) with a bout
// matching the search, or undefined when the search is empty or matches nothing.
function latestMatchingRoundId(
  rounds: TableauRound[],
  query: string,
): string | undefined {
  if (query.trim() === "") {
    return undefined;
  }
  return rounds.findLast((round) =>
    round.bouts.some((bout) => matchesQuery(bout, query)),
  )?.id;
}

export { latestMatchingRoundId };
