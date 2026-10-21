export type TournamentVisibility = "private" | "public";
export type TournamentStatus = "pending" | "active" | "ended";

export type Tournament = {
  id: string;
  name: string;
  visibility: TournamentVisibility;
  code: string;
  status: TournamentStatus;
  created_by: string;
  start_time: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TournamentListResult = {
  data: Tournament[];
  total: number;
  limit: number;
  offset: number;
};
