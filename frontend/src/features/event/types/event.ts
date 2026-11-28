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
  | "open"
  | "u9"
  | "u11"
  | "u13"
  | "u15"
  | "u17"
  | "u18"
  | "u23"
  | "cadet_u16"
  | "veteran_40"
  | "veteran_40_59"
  | "veteran_abc"
  | "veteran_50"
  | "grand_veteran"
  | "veteran_60"
  | "veteran_70";
export type EventRatingLimit =
  | "open"
  | "div_1a"
  | "c_and_above"
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
