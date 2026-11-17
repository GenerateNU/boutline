export interface TableauFencer {
  id: string;
  firstName: string;
  lastName: string;
  club: string;
  seed: number;
}

export type TableauBoutStatus = "upcoming" | "active" | "ended";

export interface TableauBout {
  id: string;
  number: number;
  status: TableauBoutStatus;
  top: TableauFencer;
  bottom: TableauFencer;
  topScore?: number;
  bottomScore?: number;
}

export interface TableauRound {
  id: string;
  size: number;
  name: string;
  boutName: string;
  bouts: TableauBout[];
}

export interface Tableau {
  rounds: TableauRound[];
}