export type EventStatus = "upcoming" | "active" | "ended";
export type EventFormat = "pool_then_direct_elimination";

export interface TournamentEvent {
  id: string;
  tournament_id: string;
  format: EventFormat;
  name: string;
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
