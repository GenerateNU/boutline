import { optimisticTouches, canUndo, competitorIdsOf, historyRows, scoringPhase, tally } from "../tally-helper";

import { useBoard } from "./use-board";
import { useResultConfirmation } from "./use-result-confirmation";
import { useScoreHistory } from "./use-score-history";
import { useScoringQueue } from "./use-scoring-queue";

export function useBoutScoring(boutId: string) {
  const { history, refreshHistory } = useScoreHistory(boutId);
  const { board, scores, confirmed, commit, setBout, loadError } = useBoard(boutId, refreshHistory);
  const {
    pending,
    error: queueError,
    revision,
    enqueue,
  } = useScoringQueue({ boutId, board, confirmed, commit, setBout, refreshHistory });

  const touches = optimisticTouches(scores, pending);
  const { confirmedBy, confirm } = useResultConfirmation(revision, touches.length, enqueue);

  const result = board ? tally(touches, competitorIdsOf(board.bout), board.bout.points_to_win) : null;
  const status = board?.bout.status ?? "upcoming";
  const phase = scoringPhase(status, result?.winnerId ?? null, pending);
  const undoable = canUndo(phase, touches.length);
  const starting = pending.some((action) => action.kind === "start");

  return {
    board,
    error: board ? queueError : loadError,
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
      if (phase === "not-started" && !starting) {
        enqueue({ kind: "start" });
      }
    },
    touch: (competitorId: string) => {
      if (phase === "scoring") {
        enqueue({ kind: "touch", competitorId });
      }
    },
    undo: () => {
      if (undoable) {
        enqueue({ kind: "undo" });
      }
    },
    confirm: (competitorId: string) => {
      if (phase === "confirming") {
        confirm(competitorId);
      }
    },
  };
}
