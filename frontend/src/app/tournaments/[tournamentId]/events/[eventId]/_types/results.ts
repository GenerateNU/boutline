export interface ResultFencer {
  id: string;
  firstName: string;
  lastName: string;
  club: string;
  rating: string;
}

export interface PoolBoutResult {
  opponent: ResultFencer;
  touchesScored: number;
  touchesReceived: number;
}

export interface PoolStanding {
  fencer: ResultFencer;
  pool: number;
  poolPlace: number;
  victories: number;
  touchesScored: number;
  touchesReceived: number;
  advanced: boolean;
  bouts: PoolBoutResult[];
}

export interface FinalPlacing {
  // Shared by tied fencers, e.g. both losing semifinalists place 3rd.
  place: number;
  standing: PoolStanding;
}
