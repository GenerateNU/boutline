import { ImportedCompetitor } from "@/types/competitor-import";

export interface FencerDraft extends ImportedCompetitor {
  // Only a React key and edit target; the backend assigns real ids on submit.
  id: string;
}

export interface EventDraft {
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
  fencers: FencerDraft[];
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
  // Events can only be saved once the tournament is.
  saved: boolean;
  events: EventDraft[];
}
