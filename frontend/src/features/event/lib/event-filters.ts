import type {
  EventAgeCategory,
  EventGender,
  EventRatingLimit,
  EventStatus,
  EventType,
  EventWeapon,
  TournamentEvent,
} from "@/features/event/types/event";
import { readStringParam, type SearchParams } from "@/lib/search-params";

// Key order is the order the filter sheet lists the options in.
const WEAPON_LABELS: Record<EventWeapon, string> = {
  foil: "Foil",
  sabre: "Sabre",
  epee: "Epee",
};

// USA Fencing's age categories, in the design's order.
const AGE_LABELS: Record<EventAgeCategory, string> = {
  u9: "Under-9",
  y10: "Under-10",
  u11: "Under-11",
  y12: "Under-12",
  u13: "Under-13",
  y14: "Under-14",
  senior: "Senior (13+)",
  u15: "Under-15",
  cadet: "Cadet (Under 17)",
  junior: "Junior (Under 20)",
  u23: "Under-23",
  cadet_u16: "Cadet (Under 16)",
  u17: "Under-17",
  u18: "Under-18",
  veteran: "Veteran 40+",
  veteran_40: "Veteran 40",
  veteran_40_59: "Veterans (40-59)",
  veteran_abc: "Veteran A-B-C",
  veteran_50: "Veteran 50",
  grand_veteran: "Grand Veterans",
  veteran_60: "Veteran 60",
  veteran_70: "Veteran 70",
  y8: "Y8",
  open: "Open",
};

const GENDER_LABELS: Record<EventGender, string> = {
  female: "Women's",
  male: "Men's",
  other: "Mixed",
};

// Named after USA Fencing divisions where an API value matches one.
const RATING_LIMIT_LABELS: Record<EventRatingLimit, string> = {
  open: "None (Open event)",
  div_1a: "Division I-A",
  c_and_above: "Division I (C & above)",
  c_and_under: "Division II (C & under)",
  d_and_under: "Division III (D & under)",
  e_and_under: "E & under",
  unrated: "Unrated only",
  b_and_under: "B & under",
};

const STATUS_LABELS: Record<EventStatus, string> = {
  ended: "Completed",
  active: "In Progress",
  upcoming: "Upcoming",
};

const TYPE_LABELS: Record<EventType, string> = {
  individual: "Individual",
  team: "Team",
};

interface EventFilters {
  weapon?: EventWeapon;
  age?: EventAgeCategory;
  gender?: EventGender;
  status?: EventStatus;
  type?: EventType;
}

function readEnumParam<T extends string>(
  query: SearchParams,
  key: string,
  labels: Record<T, string>,
): T | undefined {
  const value = readStringParam(query, key);
  return Object.hasOwn(labels, value) ? (value as T) : undefined;
}

function parseEventFilters(query: SearchParams): EventFilters {
  return {
    weapon: readEnumParam(query, "weapon", WEAPON_LABELS),
    age: readEnumParam(query, "age", AGE_LABELS),
    gender: readEnumParam(query, "gender", GENDER_LABELS),
    status: readEnumParam(query, "status", STATUS_LABELS),
    type: readEnumParam(query, "type", TYPE_LABELS),
  };
}

function matchesEventFilters(event: TournamentEvent, filters: EventFilters): boolean {
  return (
    (!filters.weapon || event.weapon === filters.weapon) &&
    (!filters.age || event.age_category === filters.age) &&
    (!filters.gender || event.gender === filters.gender) &&
    (!filters.status || event.status === filters.status) &&
    (!filters.type || event.type === filters.type)
  );
}

// Each label map as select or chip-group options.
function toOptions(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

const WEAPON_OPTIONS = toOptions(WEAPON_LABELS);
// Y8 and Open predate the design's list: still shown on events that have them, but not offered.
const AGE_OPTIONS = toOptions(AGE_LABELS).filter(({ value }) => value !== "y8" && value !== "open");
const GENDER_OPTIONS = toOptions(GENDER_LABELS);
// B & under is still accepted and shown on events that have it, but no longer offered.
const RATING_LIMIT_OPTIONS = toOptions(RATING_LIMIT_LABELS).filter(({ value }) => value !== "b_and_under");
const STATUS_OPTIONS = toOptions(STATUS_LABELS);
const TYPE_OPTIONS = toOptions(TYPE_LABELS);

// One chip per set filter; ActiveFilterChips skips the ones with no value.
function eventFilterChips({ weapon, age, gender, status, type }: EventFilters) {
  return [
    { param: "weapon", name: "Weapon", value: weapon && WEAPON_LABELS[weapon] },
    { param: "age", name: "Age", value: age && AGE_LABELS[age] },
    { param: "gender", name: "Gender", value: gender && GENDER_LABELS[gender] },
    { param: "status", name: "Status", value: status && STATUS_LABELS[status] },
    { param: "type", name: "Type", value: type && TYPE_LABELS[type] },
  ];
}

export {
  AGE_LABELS,
  AGE_OPTIONS,
  eventFilterChips,
  GENDER_LABELS,
  GENDER_OPTIONS,
  matchesEventFilters,
  parseEventFilters,
  RATING_LIMIT_LABELS,
  RATING_LIMIT_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  TYPE_LABELS,
  TYPE_OPTIONS,
  WEAPON_LABELS,
  WEAPON_OPTIONS,
};
export type { EventFilters };
