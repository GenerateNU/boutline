import { useCallback, useEffect, useRef, useState } from "react";

import type { Bout } from "@/types/bout";
import type { Competitor } from "@/types/competitor";
import type { Scoring } from "@/types/scoring";

import {
  createScoring,
  endBout,
  getBout,
  getCompetitor,
  listScoring,
  revokeScoring,
} from "../_services/scoring-api";
import type { Touch } from "../_types/tally";
import { tally } from "../tally-helper";

interface Board {
  bout: Bout;
  competitors: [Competitor, Competitor];
}

type Action = { kind: "touch"; competitorId: string } | { kind: "undo" };

// TODO: remove this bypass once bouts always have a referee (or scoring uses the
// logged-in user). It is the seeded Alex Morgan user, so it only works on a seeded database.
const FALLBACK_SCORER_ID = "a0000000-0000-4000-8000-000000000001";

// Scoring ids autoincrement, so ascending id is the order touches were recorded in.
function byRecordedOrder(scores: Scoring[]) {
  return [...scores].sort((a, b) => a.id - b.id);
}

function competitorIdsOf(bout: Bout): [string, string] {
  return [bout.competitor_1_id, bout.competitor_2_id];
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function useBoutScoring(boutId: string) {
  const [board, setBoard] = useState<Board | null>(null);
  const [scores, setScores] = useState<Scoring[]>([]);
  const [pending, setPending] = useState<Action[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Requests run one at a time so an undo always revokes the touch the referee
  // last saw, even when it was tapped before the preceding touch was saved.
  const queue = useRef(Promise.resolve());
  const confirmed = useRef<Scoring[]>([]);
  // Bumped when a request fails, which discards actions queued behind it: they
  // were tapped against a score the server never reached.
  const generation = useRef(0);

  const commit = useCallback((next: Scoring[]) => {
    confirmed.current = next;
    setScores(next);
  }, []);

  useEffect(() => {
    let ignore = false;
    Promise.all([getBout(boutId), listScoring(boutId)])
      .then(async ([bout, initialScores]) => {
        const competitors = await Promise.all([
          getCompetitor(bout.competitor_1_id),
          getCompetitor(bout.competitor_2_id),
        ]);
        if (ignore) return;
        setBoard({ bout, competitors });
        commit(byRecordedOrder(initialScores));
      })
      .catch((caught: unknown) => {
        if (!ignore) setError(errorMessage(caught));
      });
    return () => {
      ignore = true;
    };
  }, [boutId, commit]);

  // TODO: restore the referee gate once the fallback scorer is removed.
  // const refereeId = board?.bout.referee_id ?? null;
  const scorerId = board?.bout.referee_id ?? FALLBACK_SCORER_ID;

  const run = useCallback(
    async (action: Action, scorer: string) => {
      if (!board) return;
      if (action.kind === "touch") {
        const created = await createScoring(boutId, action.competitorId, scorer);
        const next = [...confirmed.current, created];
        commit(next);
        // Ending inside the same queued task means nothing can be scored or undone
        // between the winning touch and the end. Only an active bout can be ended.
        const { bout } = board;
        if (bout.status === "active" && tally(next, competitorIdsOf(bout), bout.points_to_win).winnerId) {
          setBoard({ ...board, bout: await endBout(boutId) });
        }
        return;
      }
      const latest = confirmed.current.at(-1);
      if (!latest) return;
      await revokeScoring(latest.id, scorer);
      commit(confirmed.current.slice(0, -1));
    },
    [board, boutId, commit],
  );

  const enqueue = useCallback(
    (action: Action) => {
      // TODO: restore the referee gate once the fallback scorer is removed.
      // if (!refereeId) return;
      const queuedIn = generation.current;
      setError(null);
      setPending((current) => [...current, action]);

      queue.current = queue.current.then(async () => {
        if (queuedIn !== generation.current) return;
        try {
          await run(action, scorerId);
          setPending((current) => current.slice(1));
        } catch (caught) {
          generation.current += 1;
          setPending([]);
          setError(errorMessage(caught));
          await listScoring(boutId)
            .then((fresh) => commit(byRecordedOrder(fresh)))
            .catch(() => {});
        }
      });
    },
    [boutId, commit, run, scorerId],
  );

  const touches: Touch[] = [...scores];
  for (const action of pending) {
    if (action.kind === "undo") touches.pop();
    else touches.push({ id: null, competitor_id: action.competitorId, points: 1, created_at: null });
  }

  const result = board
    ? tally(touches, competitorIdsOf(board.bout), board.bout.points_to_win)
    : null;
  const locked = board?.bout.status === "end" || Boolean(result?.winnerId);

  return {
    board,
    error,
    // TODO: restore the referee gate once the fallback scorer is removed.
    // canScore: refereeId !== null,
    // canUndo: refereeId !== null && !locked && touches.length > 0,
    canUndo: !locked && touches.length > 0,
    locked,
    tally: result,
    touch: (competitorId: string) => {
      if (!locked) enqueue({ kind: "touch", competitorId });
    },
    undo: () => {
      if (!locked) enqueue({ kind: "undo" });
    },
  };
}

export { useBoutScoring };
