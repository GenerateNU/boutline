export type ScoringAction =
  | { kind: "start" }
  | { kind: "touch"; competitorId: string }
  | { kind: "undo" }
  | { kind: "end"; touchCount: number };

export type ScoringPhase =
  | { kind: "not-started" }
  | { kind: "scoring"; onMatchPoint: string[] }
  | { kind: "confirming"; winnerId: string }
  | { kind: "over"; winnerId: string | null };
