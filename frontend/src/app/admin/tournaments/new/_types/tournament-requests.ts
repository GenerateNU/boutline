export interface TournamentRequest {
  name: string;
  city: string;
  venue: string;
  start_time: string;
  sanctioning_authority: string;
}

export interface EventRequest {
  name: string;
  start_time: string;
  type: string;
  weapon: string;
  gender: string;
  age_category: string;
  rating_limit: string;
  qualifier: boolean;
}

export interface CompetitorRequest {
  firstName: string;
  lastName: string;
  gender: string;
  birthdate: string;
  division: string;
  rating: string;
  ratingYear?: number;
  primaryClub: string;
  memberNumber: string;
}

export interface CreateCompetitorRequest extends CompetitorRequest {
  eventId: string;
}

export interface CreateEventRequest extends EventRequest {
  tournament_id: string;
}

export interface CreatedResource {
  id: string;
}
