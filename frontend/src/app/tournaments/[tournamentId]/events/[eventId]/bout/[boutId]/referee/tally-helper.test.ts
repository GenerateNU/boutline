import { BoutStatus } from "@/types/bout";
import { ScoringHistoryEntry } from "@/types/scoring";

import { ScoringAction, ScoringPhase } from "./_types/scoring-state";
import { Tally } from "./_types/tally";
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
  ])("marks $name by whether it was revoked", ({ revokedAt, revoked }) => {
    expect(historyRows([entry(3, [1, 1], revokedAt)], [])[0].revoked).toBe(revoked);
  });

  it("never marks a saving row as revoked", () => {
    expect(historyRows([], [tap("a")])[0].revoked).toBe(false);
  });
});

describe("scoringPhase", () => {
  const result = (winnerId: string | null, onMatchPoint: string[] = []) => ({
    scores: [0, 0] as [number, number],
    winnerId,
    onMatchPoint,
  });

  it.each<{ name: string; status: BoutStatus; tally: Tally; pending: ScoringAction[]; phase: ScoringPhase }>([
    { name: "upcoming", status: "upcoming", tally: result(null), pending: [], phase: { kind: "not-started" } },
    { name: "active", status: "active", tally: result(null), pending: [], phase: { kind: "scoring", onMatchPoint: [] } },
    {
      name: "active on match point",
      status: "active",
      tally: result(null, ["a"]),
      pending: [],
      phase: { kind: "scoring", onMatchPoint: ["a"] },
    },
    { name: "won", status: "active", tally: result("a"), pending: [], phase: { kind: "confirming", winnerId: "a" } },
    { name: "won and ending", status: "active", tally: result("a"), pending: [end], phase: { kind: "over", winnerId: "a" } },
    { name: "ending", status: "active", tally: result(null), pending: [end], phase: { kind: "over", winnerId: null } },
    { name: "ended", status: "ended", tally: result(null), pending: [], phase: { kind: "over", winnerId: null } },
    { name: "ended with a winner", status: "ended", tally: result("a"), pending: [], phase: { kind: "over", winnerId: "a" } },
  ])("$name -> $phase.kind", ({ status, tally, pending, phase }) => {
    expect(scoringPhase(status, tally, pending)).toEqual(phase);
  });
});

describe("canUndo", () => {
  it.each<{ phase: ScoringPhase; touchCount: number; expected: boolean }>([
    { phase: { kind: "scoring", onMatchPoint: [] }, touchCount: 1, expected: true },
    { phase: { kind: "confirming", winnerId: "a" }, touchCount: 5, expected: true },
    { phase: { kind: "scoring", onMatchPoint: [] }, touchCount: 0, expected: false },
    { phase: { kind: "not-started" }, touchCount: 3, expected: false },
    { phase: { kind: "over", winnerId: "a" }, touchCount: 3, expected: false },
  ])("$phase.kind with $touchCount touches -> $expected", ({ phase, touchCount, expected }) => {
    expect(canUndo(phase, touchCount)).toBe(expected);
  });
});

describe("byRecordedOrder", () => {
  const at = (second: number) => `2026-10-14T12:00:0${second}Z`;

  it.each([
    { name: "sorts by ascending created_at", scores: [[1, at(3)], [2, at(1)], [3, at(2)]], order: [2, 3, 1] },
    { name: "breaks created_at ties by id", scores: [[3, at(1)], [1, at(1)], [2, at(1)]], order: [1, 2, 3] },
  ] as const)("$name without mutating the input", ({ scores: rows, order }) => {
    const scores = rows.map(([id, created_at]) => ({ id, competitor_id: "a", points: 1, created_at }));
    const input = scores.map((score) => score.id);

    expect(byRecordedOrder(scores).map((score) => score.id)).toEqual(order);
    expect(scores.map((score) => score.id)).toEqual(input);
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
