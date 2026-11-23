export interface PinnedEvent {
  tournamentId: string;
  eventId: string;
}

export interface PinnedClub {
  tournamentId: string;
  name: string;
}

export interface PinnedPool extends PinnedEvent {
  id: string;
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

// A kind paired with an item of that kind, so a mixed list can't pair a club with a fencer id.
export type Pin = { [K in PinKind]: { kind: K; item: PinnedItemOf[K] } }[PinKind];

export const PINNED_STORAGE_KEY = "boutline:pinned";
export const PINNED_MAX_IDS = 100;
