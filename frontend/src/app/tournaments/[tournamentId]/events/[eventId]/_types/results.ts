export type ResultStatus = "pending" | "advanced" | "eliminated";

export interface ResultFencer {
  id: string;
  firstName: string;
  lastName: string;
  club: string;
  rating: string;
  place: number;
  pool: number;
  strip: string | null;
  status: ResultStatus;
}

export interface QualifyingResults {
  drawn: boolean;
  qualifiers: ResultFencer[];
  disqualifiers: ResultFencer[];
  qualifiedPercent: number;
}
