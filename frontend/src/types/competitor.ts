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
