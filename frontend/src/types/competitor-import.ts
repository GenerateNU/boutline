export type CompetitorRating = "A" | "B" | "C" | "D" | "E" | "U";

export type CompetitorImportStatus = "valid" | "invalid" | "duplicate";


export interface ImportedCompetitor {
  firstName: string;
  lastName: string;
  memberNumber: string;
  club: string;
  division: string;
  country: string;
  birthdate: string;
  gender: string;
  rating: CompetitorRating | "";
  ratingYear?: number;
  event: string;
}

export interface CompetitorImportRow {
  line: number;
  status: CompetitorImportStatus;
  competitor: ImportedCompetitor;
  errors: string[];
  duplicateOf?: number;
}

export interface CompetitorImportPreview {
  rows: CompetitorImportRow[];
  unknownColumns: string[];
}
