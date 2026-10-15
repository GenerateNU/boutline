export interface HistoryRow {
  key: string;
  scorerId: string;
  recordedAt: string | null;
  // Null while the touch is still saving.
  scores: [number, number] | null;
  revoked: boolean;
}
