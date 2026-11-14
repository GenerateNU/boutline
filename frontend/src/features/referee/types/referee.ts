import type { TournamentRole } from "@/features/tournament/types/tournament";

export interface RefereeResponse {
  user_id: string;
  tournament_id: string;
  role: TournamentRole;
  first_name: string;
  last_name: string;
  occupied: boolean;
  pool_number: number | null;
  created_at: string;
  updated_at: string;
}
