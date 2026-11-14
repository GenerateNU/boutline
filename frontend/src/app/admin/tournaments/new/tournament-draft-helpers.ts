import { CompetitorImportRow, ImportedCompetitor } from "@/types/competitor-import";

import { EventDraft, FencerDraft, TournamentDraft } from "./_types/tournament-draft";

export const EVENT_TYPES = ["Individual"];
export const EVENT_FORMATS = ["Pool to Direct Elimination"];

// Math.random rather than crypto.randomUUID, which is missing outside secure
// contexts such as a phone opening the dev server by LAN IP.
function draftId() {
  return Math.random().toString(36).slice(2);
}

const BLANK_FENCER: ImportedCompetitor = {
  firstName: "",
  lastName: "",
  memberNumber: "",
  club: "",
  division: "",
  country: "",
  birthdate: "",
  gender: "",
  rating: "U",
  event: "",
};

export function newFencerDraft(competitor: ImportedCompetitor = BLANK_FENCER): FencerDraft {
  return { ...competitor, id: draftId() };
}

// What POST /competitors requires, so a fencer missing any of it would fail on submit.
const REQUIRED_FENCER_FIELDS = ["firstName", "lastName", "gender", "birthdate", "division"] as const;

export type RequiredFencerField = (typeof REQUIRED_FENCER_FIELDS)[number];

export const FENCER_FIELD_LABELS: Record<RequiredFencerField, string> = {
  firstName: "first name",
  lastName: "last name",
  gender: "gender",
  birthdate: "birth date",
  division: "division",
};

export function missingFencerFields(fencer: FencerDraft): RequiredFencerField[] {
  return REQUIRED_FENCER_FIELDS.filter((field) => fencer[field].trim() === "");
}

export function newEventDraft(name = "", fencers: FencerDraft[] = []): EventDraft {
  return {
    id: draftId(),
    name,
    type: EVENT_TYPES[0],
    date: "",
    time: "",
    weapon: "",
    genderMix: "",
    ageCategory: "",
    ratingLevel: "",
    format: EVENT_FORMATS[0],
    qualifier: "",
    fencers,
    saved: false,
  };
}

// A card is called by its event's name, or by its position until it has one.
export function eventTitle(event: EventDraft, index: number) {
  return event.name.trim() || `Event ${index + 1}`;
}

const REQUIRED_EVENT_FIELDS = [
  "name",
  "type",
  "date",
  "time",
  "weapon",
  "genderMix",
  "ageCategory",
  "ratingLevel",
  "format",
  "qualifier",
] as const;

export type RequiredEventField = (typeof REQUIRED_EVENT_FIELDS)[number];

export function missingEventFields(event: EventDraft): RequiredEventField[] {
  return REQUIRED_EVENT_FIELDS.filter((field) => event[field].trim() === "");
}

const REQUIRED_TOURNAMENT_FIELDS = ["name", "location", "venue", "date", "time", "authority"] as const;

export type RequiredTournamentField = (typeof REQUIRED_TOURNAMENT_FIELDS)[number];

export function missingTournamentFields(draft: TournamentDraft): RequiredTournamentField[] {
  return REQUIRED_TOURNAMENT_FIELDS.filter((field) => draft[field].trim() === "");
}

export const EMPTY_TOURNAMENT_DRAFT: TournamentDraft = {
  name: "",
  location: "",
  venue: "",
  date: "",
  time: "",
  authority: "",
  saved: false,
  events: [newEventDraft()],
};

function eventKey(name: string) {
  return name.trim().toLowerCase();
}

// Sorts an upload's valid rows into event cards by their Event column. A card
// whose name matches (ignoring case) gets that group in place of its fencers, so
// uploading the same file twice doesn't double them, and reopens if it was saved,
// since the new fencers haven't been reviewed. Rows without an event match a card
// with no name. Any other group fills a blank card that has no fencers yet (like
// the untouched first card), then gets a new card.
export function importFencers(events: EventDraft[], rows: CompetitorImportRow[]): EventDraft[] {
  const groups = new Map<string, { name: string; fencers: FencerDraft[] }>();
  for (const row of rows) {
    if (row.status !== "valid") {
      continue;
    }
    const key = eventKey(row.competitor.event);
    const group = groups.get(key) ?? { name: row.competitor.event.trim(), fencers: [] };
    group.fencers.push(newFencerDraft(row.competitor));
    groups.set(key, group);
  }

  const matched = events.map((event) => {
    const group = groups.get(eventKey(event.name));
    if (!group) {
      return event;
    }
    groups.delete(eventKey(event.name));
    return { ...event, fencers: group.fencers, saved: false };
  });

  const unmatched = [...groups.values()];
  const filled = matched.map((event) => {
    const isPlaceholder = event.name.trim() === "" && event.fencers.length === 0;
    const group = isPlaceholder ? unmatched.shift() : undefined;
    return group ? { ...event, name: group.name, fencers: group.fencers } : event;
  });
  return [...filled, ...unmatched.map((group) => newEventDraft(group.name, group.fencers))];
}

// "C24" style: the letter plus the year's last two digits, or just "U".
export function formatRating({ rating, ratingYear }: ImportedCompetitor) {
  return `${rating}${ratingYear ? String(ratingYear).slice(-2) : ""}`;
}
