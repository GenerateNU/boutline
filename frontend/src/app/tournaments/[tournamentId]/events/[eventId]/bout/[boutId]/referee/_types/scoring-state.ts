export type ScoringAction =
  | { kind: "start" }
  | { kind: "touch"; competitorId: string }
  | { kind: "undo" }
  | { kind: "end"; touchCount: number };

export type ScoringPhase = "not-started" | "scoring" | "confirming" | "over";
