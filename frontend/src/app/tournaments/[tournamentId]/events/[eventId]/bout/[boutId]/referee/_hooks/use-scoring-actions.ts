import { useRef, useState, RefObject } from "react";

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
  // The saved scores, held in a ref so an action reads the latest list rather than the
  // one from the render that started it.
  confirmed: RefObject<Scoring[]>;
  setConfirmed: (next: Scoring[]) => void;
  setBout: (bout: Bout) => void;
  refreshHistory: () => Promise<void>;
}

// Sends the referee's actions (start, touch, undo, end) to the server one at a time,
// and recovers when one fails. A tap while an action is saving is ignored.
export function useScoringActions({
  boutId,
  matchup,
  confirmed,
  setConfirmed,
  setBout,
  refreshHistory,
}: ScoringActionsOptions) {
  // The action being saved, if any. Kept as a list so the optimistic score and the
  // history's "Saving…" row read it the same way whatever the length.
  const [pending, setPending] = useState<ScoringAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Bumped whenever the score may have changed, which voids result confirmations
  // given against the old score (see useResultConfirmation).
  const [scoreVersion, setScoreVersion] = useState(0);
  // State only updates on the next render, too late to stop a second tap in the same
  // tick, so a ref decides whether an action is already running.
  const busy = useRef(false);

  // TODO: restore the referee gate once the fallback scorer is removed.
  // const refereeId = matchup?.bout.referee_id ?? null;
  const scorerId = matchup?.bout.referee_id ?? FALLBACK_SCORER_ID;

  // Entry point for the screen. The optimistic score shows the action from `pending`
  // until the server answers.
  function submit(action: ScoringAction) {
    // TODO: restore the referee gate once the fallback scorer is removed.
    // if (!refereeId) return;
    if (busy.current) {
      return;
    }
    busy.current = true;
    const changesScore = action.kind === "touch" || action.kind === "undo";
    setError(null);
    if (changesScore) {
      setScoreVersion((current) => current + 1);
    }
    setPending([action]);
    sendAndRecover(action);
  }

  async function sendAndRecover(action: ScoringAction) {
    try {
      await send(action);
    } catch (caught) {
      setPending([]);
      await recoverFrom(caught);
    } finally {
      busy.current = false;
      setPending([]);
    }
  }

  // Runs the action against the server. A thrown error fails it into recovery.
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

  // Revokes the latest saved touch. Only one action runs at a time, so that is the
  // touch the referee saw last when they tapped undo. Like recordTouch, it updates the
  // saved scores last, so the pending undo isn't applied twice.
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

  // Shows the error and replaces the optimistic score with what the server has. Taps
  // stay ignored until the reload finishes.
  async function recoverFrom(caught: unknown) {
    setScoreVersion((current) => current + 1);
    setError(errorMessage(caught));
    await reloadFromServer();
    // The reload may have replaced the score, so confirmations given while it ran are void.
    setScoreVersion((current) => current + 1);
  }

  // Each part reloads independently, so one failing doesn't leave the others stale.
  // Reloading the bout also covers a start or end that succeeded but whose response was lost.
  async function reloadFromServer() {
    async function reloadBout() {
      setBout(await getBout(boutId));
    }
    async function reloadScores() {
      setConfirmed(byRecordedOrder(await listScoring(boutId)));
    }
    await Promise.allSettled([reloadBout(), reloadScores(), refreshHistory()]);
  }

  return { pending, error, scoreVersion, submit };
}
