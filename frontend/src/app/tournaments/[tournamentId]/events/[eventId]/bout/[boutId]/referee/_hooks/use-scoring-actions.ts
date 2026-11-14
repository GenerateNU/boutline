import { useRef, useState, RefObject } from "react";

import { useSerialQueue } from "@/hooks/use-serial-queue";
import { Bout } from "@/types/bout";
import { Scoring } from "@/types/scoring";
import { errorMessage } from "@/utils/error-message";

import {
  assignReferee,
  createScoring,
  endBout,
  getBout,
  listScoring,
  revokeScoring,
  startBout,
} from "../_services/scoring-api";
import { Matchup } from "../_types/matchup";
import { ScoringAction } from "../_types/scoring-state";
import { byRecordedOrder } from "../tally-helper";

// TODO: remove this bypass once bouts always have a referee (or scoring uses the
// logged-in user). It is the seeded Alex Morgan user, so it only works on a seeded database.
const FALLBACK_SCORER_ID = "a0000000-0000-4000-8000-000000000001";

interface ScoringActionsOptions {
  boutId: string;
  matchup: Matchup | null;
  // The saved scores, held in a ref so queued actions read the latest list rather
  // than the one from the render that queued them.
  confirmed: RefObject<Scoring[]>;
  setConfirmed: (next: Scoring[]) => void;
  setBout: (bout: Bout) => void;
  refreshHistory: () => Promise<void>;
}

// Sends the referee's actions (start, touch, undo, end) to the server in the order
// they were tapped, and recovers when one fails.
export function useScoringActions({
  boutId,
  matchup,
  confirmed,
  setConfirmed,
  setBout,
  refreshHistory,
}: ScoringActionsOptions) {
  const [error, setError] = useState<string | null>(null);
  // Bumped whenever the score may have changed, which voids result confirmations
  // given against the old score (see useResultConfirmation).
  const [scoreVersion, setScoreVersion] = useState(0);
  // Set when a failure's reload also failed, so the screen may not match the server
  // (e.g. a touch was saved but its response was lost). Scoring stays paused until a
  // retry reloads successfully, rather than building more taps on a wrong score.
  const [outOfSync, setOutOfSync] = useState(false);
  // Blocks new taps from the moment a failure starts recovering. State would only
  // catch up on the next render, too late for a tap in the same tick.
  const paused = useRef(false);
  const retrying = useRef(false);

  // TODO: restore the referee gate once the fallback scorer is removed.
  // const refereeId = matchup?.bout.referee_id ?? null;
  const scorerId = matchup?.bout.referee_id ?? FALLBACK_SCORER_ID;

  // Queued so an undo tapped before the previous touch is saved still revokes that touch.
  const { pending, enqueue } = useSerialQueue({ send, onFailure: recoverFrom });

  // Entry point for the screen: queues an action, and the optimistic score updates
  // from `pending` before the server answers.
  function submit(action: ScoringAction) {
    // TODO: restore the referee gate once the fallback scorer is removed.
    // if (!refereeId) return;
    if (paused.current) {
      return;
    }
    const changesScore = action.kind === "touch" || action.kind === "undo";
    setError(null);
    if (changesScore) {
      setScoreVersion((current) => current + 1);
    }
    enqueue(action);
  }

  // Runs one queued action against the server. A thrown error drops the rest of the queue.
  async function send(action: ScoringAction) {
    switch (action.kind) {
      case "start":
        return startMatch();
      case "end":
        return endMatch(action.touchCount);
      case "touch":
        return recordTouch(action.competitorId);
      case "undo":
        return undoLastTouch();
    }
  }

  async function startMatch() {
    // TODO: restore the referee gate once the fallback scorer is removed. The backend
    // won't start a bout without a referee and there's no referee login yet, so the
    // fallback scorer is assigned first.
    if (!matchup?.bout.referee_id) {
      await assignReferee(boutId, FALLBACK_SCORER_ID);
    }
    setBout(await startBout(boutId));
  }

  // touchCount is the number of touches both fencers confirmed. If an undo or touch
  // landed since, the result they agreed to is stale, so the end is refused.
  async function endMatch(touchCount: number) {
    if (confirmed.current.length !== touchCount) {
      throw new Error("The score changed before the bout could end");
    }
    setBout(await endBout(boutId));
  }

  // The touch stays pending until this returns, and the optimistic score already counts
  // it, so it joins the saved scores last. Adding it before the history refresh would
  // count it twice until the refresh finished.
  async function recordTouch(competitorId: string) {
    const created = await createScoring(boutId, competitorId, scorerId);
    await refreshHistoryQuietly();
    setConfirmed(byRecordedOrder([...confirmed.current, created]));
  }

  // Revokes the latest saved touch. Because actions run in order, that is the touch
  // the referee saw last when they tapped undo. Like recordTouch, it updates the saved
  // scores last, so the pending undo isn't applied twice.
  async function undoLastTouch() {
    const latest = confirmed.current.at(-1);
    if (!latest) {
      return;
    }
    await revokeScoring(latest.id, scorerId);
    await refreshHistoryQuietly();
    setConfirmed(confirmed.current.filter((score) => score.id !== latest.id));
  }

  async function refreshHistoryQuietly() {
    try {
      await refreshHistory();
    } catch {
      // A failed history fetch must not fail a touch that is already saved.
    }
  }

  // Called by the queue after a failed action, once the actions behind it are dropped.
  // Shows the error and replaces the optimistic score with what the server has. Taps
  // are paused meanwhile: they'd be made against a score that's about to change.
  async function recoverFrom(caught: unknown) {
    paused.current = true;
    setScoreVersion((current) => current + 1);
    setError(errorMessage(caught));
    await resync();
  }

  // The out-of-sync banner's Retry. On success the stale error goes too. Overlapping
  // retries are ignored, or a slow failed one could finish last and undo a success.
  async function retrySync() {
    if (retrying.current) {
      return;
    }
    retrying.current = true;
    try {
      if (await resync()) {
        setError(null);
      }
    } finally {
      retrying.current = false;
    }
  }

  async function resync() {
    const synced = await reloadFromServer();
    paused.current = !synced;
    setOutOfSync(!synced);
    // The reload may have replaced the score, so confirmations given while it ran are void.
    setScoreVersion((current) => current + 1);
    return synced;
  }

  // Each part reloads independently, so one failing doesn't leave the others stale.
  // Reloading the bout also covers a start or end that succeeded but whose response was lost.
  // Only the bout and scores decide whether the screen is in sync; the history is best-effort.
  async function reloadFromServer() {
    async function reloadBout() {
      setBout(await getBout(boutId));
    }
    async function reloadScores() {
      setConfirmed(byRecordedOrder(await listScoring(boutId)));
    }
    const [bout, scores] = await Promise.allSettled([reloadBout(), reloadScores(), refreshHistory()]);
    return bout.status === "fulfilled" && scores.status === "fulfilled";
  }

  return { pending, error, scoreVersion, outOfSync, submit, retrySync };
}
