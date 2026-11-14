import type {
  EventAgeCategory,
  EventGender,
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

const AGE_LABELS: Record<EventAgeCategory, string> = {
  y8: "Y8",
  y10: "Y10",
  y12: "Y12",
  y14: "Y14",
  cadet: "Cadet",
  junior: "Junior",
  senior: "Senior",
  veteran: "Veteran",
  open: "Open",
};

const GENDER_LABELS: Record<EventGender, string> = {
  female: "Women's",
  male: "Men's",
  other: "Mixed",
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
const AGE_OPTIONS = toOptions(AGE_LABELS);
const GENDER_OPTIONS = toOptions(GENDER_LABELS);
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
  STATUS_LABELS,
  STATUS_OPTIONS,
  TYPE_LABELS,
  TYPE_OPTIONS,
  WEAPON_LABELS,
  WEAPON_OPTIONS,
};
export type { EventFilters };
