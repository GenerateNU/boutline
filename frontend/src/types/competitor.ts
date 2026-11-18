export interface Competitor {
  id: string;
  eventId: string;
  // Absent for a competitor not entered in a tournament yet.
  tournamentId?: string;
  firstName: string;
  lastName: string;
  rating: string;
  ratingYear: number | null;
  team: string;
  checkedInAt: string | null;
}

export interface Team {
  name: string;
  competitorCount: number;
}

export interface CompetitorListResult {
  data: Competitor[];
  total: number;
  // How many of the matching rows are checked in, across every page.
  checkedIn: number;
  limit: number;
  offset: number;
}

export interface TeamListResult {
  data: Team[];
  total: number;
  limit: number;
  offset: number;
}
