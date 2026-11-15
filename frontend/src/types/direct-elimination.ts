import { ListResponse } from "@/types/list-response";

export type DirectEliminationStatus = "upcoming" | "active" | "ended";

export interface DirectElimination {
  id: string;
  status: DirectEliminationStatus;
  event_id: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type DirectEliminationListResult = ListResponse<DirectElimination>;
