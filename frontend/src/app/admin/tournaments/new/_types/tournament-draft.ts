import { ImportedCompetitor } from "@/types/competitor-import";

export interface FencerDraft extends ImportedCompetitor {
  // Local React key and edit target; competitorId is the backend's id once saved.
  id: string;
  competitorId?: string;
  // Edited since it was last saved, so the next Save event PATCHes it.
  dirty?: boolean;
}

export interface EventDraft {
  // Local id; eventId is the backend's once the event is saved.
  id: string;
  eventId?: string;
  // Saved competitors dropped from the card, deleted on the next Save event.
  removedCompetitorIds?: string[];
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
  tournamentId?: string;
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
