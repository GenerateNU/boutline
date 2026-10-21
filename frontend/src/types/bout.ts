export type BoutStatus = "upcoming" | "active" | "ended";

export interface Bout {
  id: string;
  referee_id: string | null;
  competitor_1_id: string;
  competitor_2_id: string;
  points_to_win: number;
  status: BoutStatus;
}
