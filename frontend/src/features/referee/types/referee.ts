import type { TournamentRole } from "@/features/tournament/types/tournament";

export interface RefereeResponse {
  user_id: string;
  tournament_id: string;
  role: TournamentRole;
  first_name: string;
  last_name: string;
  occupied: boolean;
  pool_number: number | null;
  // Only sent to the tournament's admins.
  email?: string;
  created_at: string;
  updated_at: string;
}

// What the Referees tab narrows the roster by; unset ones are left out of the request.
export interface RefereeFilters {
  query?: string;
  email?: string;
  pool?: number;
}
