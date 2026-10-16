import { optimisticTouches, canUndo, competitorIdsOf, historyRows, scoringPhase, tally } from "../tally-helper";

import { useMatchup } from "./use-matchup";
import { useResultConfirmation } from "./use-result-confirmation";
import { useScoreHistory } from "./use-score-history";
import { useScoringActions } from "./use-scoring-actions";

export function useBoutScoring(boutId: string) {
  const { history, refreshHistory } = useScoreHistory(boutId);
  const { matchup, scores, confirmed, setConfirmed, setBout, loadError } = useMatchup(boutId, refreshHistory);
  const {
    pending,
    error: queueError,
    scoreVersion,
    submit,
  } = useScoringActions({ boutId, matchup, confirmed, setConfirmed, setBout, refreshHistory });

  const touches = optimisticTouches(scores, pending);
  const { confirmedBy, confirm } = useResultConfirmation(scoreVersion, touches.length, submit);

  const result = matchup ? tally(touches, competitorIdsOf(matchup.bout), matchup.bout.points_to_win) : null;
  const phase = matchup && result ? scoringPhase(matchup.bout.status, result, pending) : null;
  const undoable = phase !== null && canUndo(phase, touches.length);
  const starting = pending.some((action) => action.kind === "start");

  return {
    matchup,
    error: matchup ? queueError : loadError,
    phase,
    starting,
    // TODO: restore the referee gate once the fallback scorer is removed.
    // canScore: refereeId !== null,
    // canUndo: refereeId !== null && !locked && touches.length > 0,
    canUndo: undoable,
    tally: result,
    history: historyRows(history, pending),
    confirmedBy,
    start: () => {
      if (phase?.kind === "not-started" && !starting) {
        submit({ kind: "start" });
      }
    },
    touch: (competitorId: string) => {
      if (phase?.kind === "scoring") {
        submit({ kind: "touch", competitorId });
      }
    },
    undo: () => {
      if (undoable) {
        submit({ kind: "undo" });
      }
    },
    confirm: (competitorId: string) => {
      // While a touch or undo is saving, the end a second confirmation submits would be ignored.
      if (phase?.kind === "confirming" && pending.length === 0) {
        confirm(competitorId);
      }
    },
  };
}
