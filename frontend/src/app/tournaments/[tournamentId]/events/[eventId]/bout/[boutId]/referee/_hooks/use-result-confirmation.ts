import { useState } from "react";

import { ScoringAction } from "../_types/scoring-state";

interface Confirmations {
  scoreVersion: number;
  competitorIds: string[];
}

export function useResultConfirmation(
  scoreVersion: number,
  touchCount: number,
  submit: (action: ScoringAction) => void,
) {
  const [state, setState] = useState<Confirmations>({ scoreVersion, competitorIds: [] });
  // Confirmations only hold for the score they were given against. The version only
  // increases, so an old confirmation can never come back.
  const confirmedBy = state.scoreVersion === scoreVersion ? state.competitorIds : [];

  function confirm(competitorId: string) {
    if (confirmedBy.includes(competitorId)) {
      return;
    }
    const competitorIds = [...confirmedBy, competitorId];
    setState({ scoreVersion, competitorIds });
    if (competitorIds.length === 2) {
      submit({ kind: "end", touchCount });
    }
  }

  return { confirmedBy, confirm };
}
