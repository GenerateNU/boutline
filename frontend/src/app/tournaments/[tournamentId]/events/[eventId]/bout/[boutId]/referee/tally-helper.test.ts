import type { BoutStatus } from "@/types/bout";
import type { ScoringHistoryEntry } from "@/types/scoring";

import type { ScoringAction, ScoringPhase } from "./_types/scoring-state";
import {
  byRecordedOrder,
  canUndo,
  historyRows,
  optimisticTouches,
  scoringPhase,
  tally,
  winnerFirst,
} from "./tally-helper";

const IDS: [string, string] = ["a", "b"];
const touch = (competitor_id: string, points = 1) => ({ competitor_id, points });
const tap = (competitorId: string): ScoringAction => ({ kind: "touch", competitorId });
const undo: ScoringAction = { kind: "undo" };
const end: ScoringAction = { kind: "end", touchCount: 5 };

describe("tally", () => {
  it.each([
    { name: "sums each side", touches: [touch("a"), touch("b"), touch("a")], scores: [2, 1] },
    { name: "counts points above one", touches: [touch("a", 3), touch("b", 2)], scores: [3, 2] },
    { name: "ignores an unknown scorer", touches: [touch("zzz"), touch("a")], scores: [1, 0] },
  ])("$name", ({ touches, scores }) => {
    expect(tally(touches, IDS, 5).scores).toEqual(scores);
  });

  it.each([
    { name: "no winner short of the target", touches: [touch("a", 4)], winnerId: null },
    { name: "first side reaching the target", touches: [touch("a", 5)], winnerId: "a" },
    { name: "second side reaching the target", touches: [touch("a", 2), touch("b", 6)], winnerId: "b" },
  ])("winner: $name", ({ touches, winnerId }) => {
    expect(tally(touches, IDS, 5).winnerId).toBe(winnerId);
  });

  it.each([
    { name: "nobody", touches: [touch("a", 3), touch("b", 2)], onMatchPoint: [] },
    { name: "one fencer", touches: [touch("a", 4), touch("b", 2)], onMatchPoint: ["a"] },
    { name: "both fencers", touches: [touch("a", 4), touch("b", 4)], onMatchPoint: ["a", "b"] },
    { name: "nobody once won", touches: [touch("a", 5), touch("b", 4)], onMatchPoint: [] },
  ])("match point: $name", ({ touches, onMatchPoint }) => {
    expect(tally(touches, IDS, 5).onMatchPoint).toEqual(onMatchPoint);
  });
});

describe("optimisticTouches", () => {
  it.each([
    { name: "a pending touch is appended", confirmed: [touch("a")], pending: [tap("b")], expected: [touch("a"), touch("b")] },
    { name: "a pending undo pops a confirmed touch", confirmed: [touch("a"), touch("b")], pending: [undo], expected: [touch("a")] },
    { name: "a pending undo pops a pending touch", confirmed: [touch("a")], pending: [tap("b"), undo], expected: [touch("a")] },
    { name: "start and end are ignored", confirmed: [touch("a")], pending: [{ kind: "start" } as const, end], expected: [touch("a")] },
  ])("$name", ({ confirmed, pending, expected }) => {
    expect(optimisticTouches(confirmed, pending)).toEqual(expected);
  });

  it("does not mutate the confirmed list", () => {
    const confirmed = [touch("a")];
    optimisticTouches(confirmed, [undo]);
    expect(confirmed).toEqual([touch("a")]);
  });
});

describe("historyRows", () => {
  const entry = (id: number, scores: [number, number], revokedAt: string | null = null): ScoringHistoryEntry => ({
    id,
    competitor_id: id === 2 ? "b" : "a",
    points: 1,
    created_at: "2026-10-14T12:00:00Z",
    revoked_at: revokedAt,
    competitor_1_score: scores[0],
    competitor_2_score: scores[1],
  });
  const entries = [entry(2, [1, 1]), entry(1, [1, 0])];

  it("puts saving rows on top, newest tap first, above the server rows in the order given", () => {
    const rows = historyRows(entries, [tap("a"), tap("b")]);

    expect(rows.map(({ key, scorerId, recordedAt, scores }) => [key, scorerId, recordedAt, scores])).toEqual([
      ["saving-1", "b", null, null],
      ["saving-0", "a", null, null],
      ["2", "b", "2026-10-14T12:00:00Z", [1, 1]],
      ["1", "a", "2026-10-14T12:00:00Z", [1, 0]],
    ]);
  });

  it("a pending undo hides nothing", () => {
    expect(historyRows(entries, [undo]).map((row) => row.key)).toEqual(["2", "1"]);
  });

  it.each([
    { name: "a live touch", revokedAt: null, revoked: false },
    { name: "a revoked touch", revokedAt: "2026-10-14T12:01:00Z", revoked: true },
  ])("marks  by whether it was revoked", ({ revokedAt, revoked }) => {
    expect(historyRows([entry(3, [1, 1], revokedAt)], [])[0].revoked).toBe(revoked);
  });

  it("never marks a saving row as revoked", () => {
    expect(historyRows([], [tap("a")])[0].revoked).toBe(false);
  });
});

describe("scoringPhase", () => {
  it.each<{ status: BoutStatus; winnerId: string | null; pending: ScoringAction[]; phase: ScoringPhase }>([
    { status: "upcoming", winnerId: null, pending: [], phase: "not-started" },
    { status: "active", winnerId: null, pending: [], phase: "scoring" },
    { status: "active", winnerId: "a", pending: [], phase: "confirming" },
    { status: "active", winnerId: "a", pending: [end], phase: "over" },
    { status: "active", winnerId: null, pending: [end], phase: "over" },
    { status: "end", winnerId: null, pending: [], phase: "over" },
    { status: "end", winnerId: "a", pending: [], phase: "over" },
  ])("$status, winner $winnerId, pending $pending.length -> $phase", ({ status, winnerId, pending, phase }) => {
    expect(scoringPhase(status, winnerId, pending)).toBe(phase);
  });
});

describe("canUndo", () => {
  it.each([
    { phase: "scoring", touchCount: 1, expected: true },
    { phase: "confirming", touchCount: 5, expected: true },
    { phase: "scoring", touchCount: 0, expected: false },
    { phase: "not-started", touchCount: 3, expected: false },
    { phase: "over", touchCount: 3, expected: false },
  ] as const)("$phase with $touchCount touches -> $expected", ({ phase, touchCount, expected }) => {
    expect(canUndo(phase, touchCount)).toBe(expected);
  });
});

describe("byRecordedOrder", () => {
  it("sorts by ascending id without mutating the input", () => {
    const scores = [3, 1, 2].map((id) => ({ id, competitor_id: "a", points: 1, created_at: "" }));

    expect(byRecordedOrder(scores).map((score) => score.id)).toEqual([1, 2, 3]);
    expect(scores.map((score) => score.id)).toEqual([3, 1, 2]);
  });
});

describe("winnerFirst", () => {
  it.each([
    { name: "first side won", scores: [5, 2], winnerId: "a" },
    { name: "second side won", scores: [2, 5], winnerId: "b" },
  ] as const)("$name", ({ scores, winnerId }) => {
    expect(winnerFirst([...scores], IDS, winnerId)).toEqual([5, 2]);
  });
});
