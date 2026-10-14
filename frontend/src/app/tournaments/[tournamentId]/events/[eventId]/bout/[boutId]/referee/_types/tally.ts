export interface Touch {
  competitor_id: string;
  points: number;
}

export interface Tally {
  scores: [number, number];
  winnerId: string | null;
  onMatchPoint: string[];
}
