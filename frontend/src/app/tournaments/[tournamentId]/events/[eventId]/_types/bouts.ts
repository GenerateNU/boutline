export type Side = "left" | "right";

export interface BoutFencer {
  name: string;
  club: string;
  score: number;
}

// One row of a placeholder bout's score audit, with the score it produced.
export interface AuditEntry {
  time: string;
  scorer: Side;
  leftScore: number;
  rightScore: number;
}

// A bout as the event's bout lists show it (placeholder until the list comes from the API).
export interface BoutSummary {
  id: string;
  stage: "pool" | "tableau";
  round: string;
  left: BoutFencer;
  right: BoutFencer;
  audit: AuditEntry[];
}
