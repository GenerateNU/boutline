import type { HistoryEntry, Tally, Touch } from "./_types/tally";

export function tally(touches: Touch[], competitorIds: [string, string], pointsToWin: number): Tally {
  const scores: [number, number] = [0, 0];
  const history = touches.map((touch, index): HistoryEntry => {
    const side = competitorIds.indexOf(touch.competitor_id);
    if (side !== -1) scores[side] += touch.points;
    return {
      key: touch.id === null ? `pending-${index}` : String(touch.id),
      scorerId: touch.competitor_id,
      recordedAt: touch.created_at,
      scores: [scores[0], scores[1]],
    };
  });

  const winner = scores.findIndex((score) => score >= pointsToWin);
  const winnerId = winner === -1 ? null : competitorIds[winner];
  const isDecided = winnerId !== null;
  const matchPointScore = pointsToWin - 1;
  const onMatchPoint = isDecided
    ? []
    : competitorIds.filter((_, side) => scores[side] === matchPointScore);

  return { scores, history, winnerId, onMatchPoint };
}
