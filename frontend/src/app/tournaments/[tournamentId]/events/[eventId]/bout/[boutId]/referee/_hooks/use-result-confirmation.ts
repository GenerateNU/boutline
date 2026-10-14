import { useState } from "react";

import type { ScoringAction } from "../_types/scoring-state";

interface Confirmations {
  revision: number;
  competitorIds: string[];
}

export function useResultConfirmation(
  revision: number,
  touchCount: number,
  enqueue: (action: ScoringAction) => void,
) {
  const [state, setState] = useState<Confirmations>({ revision, competitorIds: [] });
  // Confirmations only hold for the score they were given against. Revision only
  // increases, so an old confirmation can never come back.
  const confirmedBy = state.revision === revision ? state.competitorIds : [];

  function confirm(competitorId: string) {
    if (confirmedBy.includes(competitorId)) {
      return;
    }
    const competitorIds = [...confirmedBy, competitorId];
    setState({ revision, competitorIds });
    if (competitorIds.length === 2) {
      enqueue({ kind: "end", touchCount });
    }
  }

  return { confirmedBy, confirm };
}
