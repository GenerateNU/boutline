import type { Bout, BoutStatus } from "@/types/bout";
import type { Scoring, ScoringHistoryEntry } from "@/types/scoring";

import type { HistoryRow } from "./_types/history-row";
import type { ScoringAction, ScoringPhase } from "./_types/scoring-state";
import type { Tally, Touch } from "./_types/tally";

export function tally(touches: Touch[], competitorIds: [string, string], pointsToWin: number): Tally {
  const scores: [number, number] = [0, 0];
  for (const touch of touches) {
    const side = competitorIds.indexOf(touch.competitor_id);
    if (side !== -1) {
      scores[side] += touch.points;
    }
  }

  const winner = scores.findIndex((score) => score >= pointsToWin);
  const winnerId = winner === -1 ? null : competitorIds[winner];
  const isDecided = winnerId !== null;
  const matchPointScore = pointsToWin - 1;
  const onMatchPoint = isDecided
    ? []
    : competitorIds.filter((_, side) => scores[side] === matchPointScore);

  return { scores, winnerId, onMatchPoint };
}

// Scoring ids autoincrement, so ascending id is the order touches were recorded in.
export function byRecordedOrder(scores: Scoring[]) {
  return [...scores].sort((a, b) => a.id - b.id);
}

export function competitorIdsOf(bout: Bout): [string, string] {
  return [bout.competitor_1_id, bout.competitor_2_id];
}

export function optimisticTouches(confirmed: Touch[], pending: ScoringAction[]): Touch[] {
  const touches = [...confirmed];
  for (const action of pending) {
    if (action.kind === "undo") {
      touches.pop();
    }
    if (action.kind === "touch") {
      touches.push({ competitor_id: action.competitorId, points: 1 });
    }
  }
  return touches;
}

export function historyRows(entries: ScoringHistoryEntry[], pending: ScoringAction[]): HistoryRow[] {
  const saving = pending
    .filter((action) => action.kind === "touch")
    .map((action, index): HistoryRow => ({
      key: `saving-${index}`,
      scorerId: action.competitorId,
      recordedAt: null,
      scores: null,
      revoked: false,
    }))
    .reverse();
  const saved = entries.map((entry): HistoryRow => ({
    key: String(entry.id),
    scorerId: entry.competitor_id,
    recordedAt: entry.created_at,
    scores: [entry.competitor_1_score, entry.competitor_2_score],
    revoked: entry.revoked_at !== null,
  }));
  return [...saving, ...saved];
}

export function scoringPhase(
  status: BoutStatus,
  winnerId: string | null,
  pending: ScoringAction[],
): ScoringPhase {
  const isEnding = pending.some((action) => action.kind === "end");
  const isOver = status === "end" || isEnding;
  const isUpcoming = status === "upcoming";
  if (isOver) {
    return "over";
  }
  if (isUpcoming) {
    return "not-started";
  }
  if (winnerId) {
    return "confirming";
  }
  return "scoring";
}

export function canUndo(phase: ScoringPhase, touchCount: number) {
  const isUndoablePhase = phase === "scoring" || phase === "confirming";
  return isUndoablePhase && touchCount > 0;
}

export function winnerFirst(
  scores: [number, number],
  competitorIds: [string, string],
  winnerId: string,
): [number, number] {
  return winnerId === competitorIds[0] ? scores : [scores[1], scores[0]];
}
