import type { TableauBoutStatus } from "./tableau";

export interface TableauFencerResponse {
  id: string;
  first_name: string;
  last_name: string;
  club: string | null;
  seed: number;
}

export interface TableauBoutResponse {
  id: string;
  slot: number;
  status: TableauBoutStatus;
  top: TableauFencerResponse;
  bottom: TableauFencerResponse;
  top_score: number | null;
  bottom_score: number | null;
}

export interface TableauRoundResponse {
  size: number;
  bouts: TableauBoutResponse[];
}

export interface TableauResponse {
  rounds: TableauRoundResponse[];
}
