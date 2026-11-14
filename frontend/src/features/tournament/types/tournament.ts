export type TournamentVisibility = "private" | "public";
export type TournamentStatus = "pending" | "active" | "ended";

export interface Tournament {
  id: string;
  name: string;
  visibility: TournamentVisibility;
  code: string;
  status: TournamentStatus;
  created_by: string;
  start_time: string | null;
  city: string | null;
  country: string | null;
  venue: string | null;
  sanctioning_authority: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TournamentListFilters {
  query?: string;
  status?: TournamentStatus;
  visibility?: TournamentVisibility;
  date?: string;
  timeZone?: string;
  club?: string;
  country?: string;
  // Only tournaments the caller created. Sent as `mine=true`, which the API
  // refuses without a session token.
  createdByMe?: boolean;
}

export interface TournamentListResult {
  data: Tournament[];
  total: number;
  limit: number;
  offset: number;
}

export type TournamentRole = "admin" | "referee";

export interface TournamentRoleResponse {
  role: TournamentRole | null;
}
