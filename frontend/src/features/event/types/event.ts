export type EventStatus = "upcoming" | "active" | "ended";
export type EventFormat = "pool_then_direct_elimination";

export type EventType = "individual" | "team";
export type EventWeapon = "foil" | "epee" | "sabre";
export type EventGender = "male" | "female" | "other";
export type EventAgeCategory =
  | "y8"
  | "y10"
  | "y12"
  | "y14"
  | "cadet"
  | "junior"
  | "senior"
  | "veteran"
  | "open";
export type EventRatingLimit =
  | "open"
  | "b_and_under"
  | "c_and_under"
  | "d_and_under"
  | "e_and_under"
  | "unrated";

export interface TournamentEvent {
  id: string;
  tournament_id: string;
  format: EventFormat;
  name: string;
  type: EventType | null;
  weapon: EventWeapon | null;
  gender: EventGender | null;
  age_category: EventAgeCategory | null;
  rating_limit: EventRatingLimit | null;
  qualifier: boolean;
  status: EventStatus;
  start_time: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventListResult {
  data: TournamentEvent[];
  total: number;
  limit: number;
  offset: number;
}
