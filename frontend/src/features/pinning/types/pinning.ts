export interface PinnedEvent {
  tournamentId: string;
  eventId: string;
  eventName: string;
}

export interface PinnedClub {
  tournamentId: string;
  name: string;
}

export interface PinnedPool extends PinnedEvent {
  id: string;
  title: string;
}

export type PinnedTableau = PinnedEvent;

export interface PinnedItems {
  fencerIds: string[];
  clubs: PinnedClub[];
  pools: PinnedPool[];
  tableaus: PinnedTableau[];
}

export type PinKind = "fencer" | "club" | "pool" | "tableau";

export interface PinnedItemOf {
  fencer: string;
  club: PinnedClub;
  pool: PinnedPool;
  tableau: PinnedTableau;
}

export const PINNED_STORAGE_KEY = "boutline:pinned";
export const PINNED_MAX_IDS = 100;
