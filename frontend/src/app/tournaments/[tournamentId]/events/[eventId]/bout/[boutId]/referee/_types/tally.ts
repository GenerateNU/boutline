export interface Touch {
  // Null until the server has saved the touch.
  id: number | null;
  competitor_id: string;
  points: number;
  created_at: string | null;
}

export interface HistoryEntry {
  key: string;
  scorerId: string;
  recordedAt: string | null;
  scores: [number, number];
}

export interface Tally {
  scores: [number, number];
  // Oldest first, each with the score as it stood after that touch.
  history: HistoryEntry[];
  winnerId: string | null;
  onMatchPoint: string[];
}
