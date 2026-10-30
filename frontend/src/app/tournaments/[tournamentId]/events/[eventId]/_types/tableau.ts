export interface TableauFencer {
  id: string;
  firstName: string;
  lastName: string;
  club: string;
  seed: number;
}

export interface TableauBout {
  id: string;
  number: number;
  top: TableauFencer;
  bottom: TableauFencer;
  topScore?: number;
  bottomScore?: number;
}

export interface TableauRound {
  id: string;
  name: string;
  boutName: string;
  bouts: TableauBout[];
}

export interface Tableau {
  rounds: TableauRound[];
}