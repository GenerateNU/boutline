import { CompetitorImportRow, ImportedCompetitor } from "@/types/competitor-import";

import { EventDraft, TournamentDraft } from "./_types/tournament-draft";

export const EVENT_TYPES = ["Individual"];
export const EVENT_FORMATS = ["Pool to Direct Elimination"];

export function newEventDraft(name = "", fencers: ImportedCompetitor[] = []): EventDraft {
  return {
    // Math.random rather than crypto.randomUUID, which is missing outside secure
    // contexts such as a phone opening the dev server by LAN IP.
    id: Math.random().toString(36).slice(2),
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

export const EMPTY_TOURNAMENT_DRAFT: TournamentDraft = {
  name: "",
  location: "",
  venue: "",
  date: "",
  time: "",
  authority: "",
  events: [newEventDraft()],
};

function eventKey(name: string) {
  return name.trim().toLowerCase();
}

// Sorts an upload's valid rows into event cards by their Event column. A card
// whose name matches (ignoring case) gets that group in place of its fencers, so
// uploading the same file twice doesn't double them. Rows without an event match
// a card with no name. Any other group fills a blank card that has no fencers yet
// (like the untouched first card), then gets a new card.
export function importFencers(events: EventDraft[], rows: CompetitorImportRow[]): EventDraft[] {
  const groups = new Map<string, { name: string; fencers: ImportedCompetitor[] }>();
  for (const row of rows) {
    if (row.status !== "valid") {
      continue;
    }
    const key = eventKey(row.competitor.event);
    const group = groups.get(key) ?? { name: row.competitor.event.trim(), fencers: [] };
    group.fencers.push(row.competitor);
    groups.set(key, group);
  }

  const matched = events.map((event) => {
    const group = groups.get(eventKey(event.name));
    if (!group) {
      return event;
    }
    groups.delete(eventKey(event.name));
    return { ...event, fencers: group.fencers };
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
