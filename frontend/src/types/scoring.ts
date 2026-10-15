export interface Scoring {
  id: number;
  competitor_id: string;
  points: number;
  created_at: string;
}

export interface ScoringHistoryEntry {
  id: number;
  competitor_id: string;
  points: number;
  created_at: string;
  // Set when the touch was undone; it stays listed but no longer counts.
  revoked_at: string | null;
  competitor_1_score: number;
  competitor_2_score: number;
}

export interface ScoringHistoryResponse {
  data: ScoringHistoryEntry[];
}
