import { CompetitorImportRow, ImportedCompetitor } from "@/types/competitor-import";

import { EventDraft, FencerDraft, TournamentDraft } from "./_types/tournament-draft";

export const EVENT_TYPES = ["Individual"];
export const EVENT_FORMATS = ["Pool to Direct Elimination"];

function draftId() {
  return Math.random().toString(36).slice(2);
}

// A fencer added by hand. Unrated, as the parser reads a blank rating.
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

// Spellings a registration export might use for each gender POST /competitors
// accepts. A Map, so a cell like "constructor" can't reach Object.prototype.
const GENDER_SPELLINGS = new Map([
  ["f", "F"],
  ["female", "F"],
  ["w", "F"],
  ["woman", "F"],
  ["women", "F"],
  ["m", "M"],
  ["male", "M"],
  ["man", "M"],
  ["men", "M"],
  ["o", "O"],
  ["other", "O"],
]);

export function newFencerDraft(competitor: ImportedCompetitor = BLANK_FENCER): FencerDraft {
  // The parser keeps the file's gender as written. Anything unrecognized becomes
  // blank, so the card asks for it instead of keeping a value the API would reject.
  const gender = GENDER_SPELLINGS.get(competitor.gender.trim().toLowerCase()) ?? "";
  return { ...competitor, gender, id: draftId() };
}

// What POST /competitors requires, so a fencer missing any of it would fail on submit.
const REQUIRED_FENCER_FIELDS = ["firstName", "lastName", "gender", "birthdate", "division"] as const;

export type RequiredFencerField = (typeof REQUIRED_FENCER_FIELDS)[number];

// Wording for a fencer card's "Missing …" line.
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

export function hasIncompleteFencers(event: EventDraft) {
  return event.fencers.some((fencer) => missingFencerFields(fencer).length > 0);
}

// Type and format have one option each today, so they start chosen.
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

// Every field on an event card is required.
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

// Starts with one blank event card, so there is always one to fill in or import into.
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

// Event names match ignoring case and surrounding spaces ("Y14 Foil " = "y14 foil").
function eventKey(name: string) {
  return name.trim().toLowerCase();
}

// Sorts an upload's valid rows into event cards by their Event column.
export function importFencers(events: EventDraft[], rows: CompetitorImportRow[]): EventDraft[] {
  // Group the rows by event, keeping the file's order. Invalid and duplicate rows
  // are left out; rows with no event form a group named "".
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

  // A card with the same name takes its group in place of its fencers, so a second
  // upload of the file doesn't double them. It reopens if it was saved, since the
  // new fencers haven't been reviewed.
  const matched = events.map((event) => {
    const group = groups.get(eventKey(event.name));
    if (!group) {
      return event;
    }
    groups.delete(eventKey(event.name));
    return { ...event, fencers: group.fencers, saved: false };
  });

  // Leftover groups fill blank cards with no fencers yet, such as the untouched
  // first card, so it isn't left empty beside the new ones.
  const unmatched = [...groups.values()];
  const filled = matched.map((event) => {
    const isPlaceholder = event.name.trim() === "" && event.fencers.length === 0;
    const group = isPlaceholder ? unmatched.shift() : undefined;
    return group ? { ...event, name: group.name, fencers: group.fencers } : event;
  });

  // Whatever is still left gets a new card each.
  return [...filled, ...unmatched.map((group) => newEventDraft(group.name, group.fencers))];
}

// How many events an upload's valid rows fill, matching importFencers' grouping.
export function importedEventCount(rows: CompetitorImportRow[]) {
  return new Set(rows.filter((row) => row.status === "valid").map((row) => eventKey(row.competitor.event))).size;
}

// "C24" style: the letter plus the year's last two digits, or just "U".
export function formatRating({ rating, ratingYear }: ImportedCompetitor) {
  return `${rating}${ratingYear ? String(ratingYear).slice(-2) : ""}`;
}
