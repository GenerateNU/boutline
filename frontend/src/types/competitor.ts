export interface Competitor {
  id: string;
  // Absent for a competitor not entered in a tournament yet.
  tournamentId?: string;
  firstName: string;
  lastName: string;
  rating: string;
  team: string;
}

export interface Team {
  name: string;
  competitorCount: number;
}

export interface CompetitorListResult {
  data: Competitor[];
  total: number;
  limit: number;
  offset: number;
}

export interface TeamListResult {
  data: Team[];
  total: number;
  limit: number;
  offset: number;
}
