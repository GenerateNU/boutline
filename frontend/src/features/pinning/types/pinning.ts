import { Competitor } from "@/types/competitor";

export interface PinnedIds {
  fencerIds: string[];
  boutIds: string[];
}

// The design pins fencers, clubs and pools; only fencers can be pinned so far.
export interface PinnedItems {
  fencers: Competitor[];
}

export const PINNED_STORAGE_KEY = "boutline:pinned";
export const PINNED_MAX_IDS = 100;
