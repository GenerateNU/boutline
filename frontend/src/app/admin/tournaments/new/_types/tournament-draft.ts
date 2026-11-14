import { ImportedCompetitor } from "@/types/competitor-import";

export interface EventDraft {
  // Only a React key; the backend assigns real ids on submit.
  id: string;
  name: string;
  type: string;
  date: string;
  time: string;
  weapon: string;
  genderMix: string;
  ageCategory: string;
  ratingLevel: string;
  format: string;
  qualifier: string;
  fencers: ImportedCompetitor[];
  // Saved cards collapse to a summary until the admin edits them again.
  saved: boolean;
}

export interface TournamentDraft {
  name: string;
  location: string;
  venue: string;
  date: string;
  time: string;
  authority: string;
  events: EventDraft[];
}
