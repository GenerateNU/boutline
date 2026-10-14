import { useCallback, useRef, useState, type RefObject } from "react";

import type { Bout } from "@/types/bout";
import type { Scoring } from "@/types/scoring";
import { errorMessage } from "@/utils/error-message";

import {
  createScoring,
  endBout,
  getBout,
  listScoring,
  revokeScoring,
  startBout,
} from "../_services/scoring-api";
import type { Board } from "../_types/board";
import type { ScoringAction } from "../_types/scoring-state";
import { byRecordedOrder } from "../tally-helper";

// TODO: remove this bypass once bouts always have a referee (or scoring uses the
// logged-in user). It is the seeded Alex Morgan user, so it only works on a seeded database.
const FALLBACK_SCORER_ID = "a0000000-0000-4000-8000-000000000001";

interface ScoringQueueOptions {
  boutId: string;
  board: Board | null;
  confirmed: RefObject<Scoring[]>;
  commit: (next: Scoring[]) => void;
  setBout: (bout: Bout) => void;
  refreshHistory: () => Promise<void>;
}

export function useScoringQueue({
  boutId,
  board,
  confirmed,
  commit,
  setBout,
  refreshHistory,
}: ScoringQueueOptions) {
  const [pending, setPending] = useState<ScoringAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Bumped whenever the score may have changed, so confirmations given against an
  // older score can be told apart from current ones.
  const [revision, setRevision] = useState(0);

  // Requests run one at a time so an undo always revokes the touch the referee
  // last saw, even when it was tapped before the preceding touch was saved.
  const queue = useRef(Promise.resolve());
  // Bumped when a request fails, which discards actions queued behind it: they
  // were tapped against a score the server never reached.
  const generation = useRef(0);

  // TODO: restore the referee gate once the fallback scorer is removed.
  // const refereeId = board?.bout.referee_id ?? null;
  const scorerId = board?.bout.referee_id ?? FALLBACK_SCORER_ID;

  const run = useCallback(
    async (action: ScoringAction, scorer: string) => {
      if (action.kind === "start") {
        setBout(await startBout(boutId));
        return;
      }
      if (action.kind === "end") {
        // An end never runs against a score the fencers did not see confirmed.
        if (confirmed.current.length !== action.touchCount) {
          throw new Error("The score changed before the bout could end");
        }
        setBout(await endBout(boutId));
        return;
      }
      if (action.kind === "touch") {
        const created = await createScoring(boutId, action.competitorId, scorer);
        commit([...confirmed.current, created]);
      } else {
        const latest = confirmed.current.at(-1);
        if (!latest) {
          return;
        }
        await revokeScoring(latest.id, scorer);
        commit(confirmed.current.slice(0, -1));
      }
      // A failed history fetch must not fail a touch that is already saved.
      await refreshHistory().catch(() => {});
    },
    [boutId, commit, confirmed, refreshHistory, setBout],
  );

  // Each request resyncs on its own, so one failure doesn't leave the others stale.
  // Re-fetching the bout also covers a start or end that succeeded but whose response was lost.
  const resync = useCallback(async () => {
    const bout = getBout(boutId).then(setBout);
    const scores = listScoring(boutId).then((fresh) => commit(byRecordedOrder(fresh)));
    await Promise.allSettled([bout, scores, refreshHistory()]);
  }, [boutId, commit, refreshHistory, setBout]);

  const enqueue = useCallback(
    (action: ScoringAction) => {
      // TODO: restore the referee gate once the fallback scorer is removed.
      // if (!refereeId) return;
      const queuedIn = generation.current;
      setError(null);
      if (action.kind === "touch" || action.kind === "undo") {
        setRevision((current) => current + 1);
      }
      setPending((current) => [...current, action]);

      queue.current = queue.current.then(async () => {
        if (queuedIn !== generation.current) {
          return;
        }
        try {
          await run(action, scorerId);
          setPending((current) => current.slice(1));
        } catch (caught) {
          generation.current += 1;
          setPending([]);
          setRevision((current) => current + 1);
          setError(errorMessage(caught));
          await resync();
        }
      });
    },
    [resync, run, scorerId],
  );

  return { pending, error, revision, enqueue };
}
