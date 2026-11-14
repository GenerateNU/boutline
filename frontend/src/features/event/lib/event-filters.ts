import type {
  EventAgeCategory,
  EventGender,
  EventStatus,
  EventType,
  EventWeapon,
  TournamentEvent,
} from "@/features/event/types/event";
import type { ActiveFilter } from "@/features/tournament/components/active-filter-chips";
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

function eventFilterChips({ weapon, age, gender, status, type }: EventFilters): ActiveFilter[] {
  return [
    { param: "weapon", label: weapon && WEAPON_LABELS[weapon] },
    { param: "age", label: age && AGE_LABELS[age] },
    { param: "gender", label: gender && GENDER_LABELS[gender] },
    { param: "status", label: status && STATUS_LABELS[status] },
    { param: "type", label: type && TYPE_LABELS[type] },
  ].filter((chip): chip is ActiveFilter => Boolean(chip.label));
}

export {
  AGE_LABELS,
  eventFilterChips,
  GENDER_LABELS,
  matchesEventFilters,
  parseEventFilters,
  STATUS_LABELS,
  TYPE_LABELS,
  WEAPON_LABELS,
};
export type { EventFilters };
