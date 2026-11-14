import { readOffsetParam, readStringParam, type SearchParams } from "@/lib/search-params";

interface FilterOption {
  value: string;
  label: string;
}

const MAX_CLUB_LENGTH = 120;
export const FENCER_PAGE_SIZE = 20;

export const RATING_OPTIONS: FilterOption[] = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
  { value: "E", label: "E" },
  { value: "U", label: "Unrated" },
];

export const GENDER_OPTIONS: FilterOption[] = [
  { value: "F", label: "Female" },
  { value: "M", label: "Male" },
  { value: "O", label: "Other" },
];

export function optionLabel(options: FilterOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? "";
}

export function parseFencerFilters(query: SearchParams) {
  const team = readStringParam(query, "team");
  const rating = readStringParam(query, "rating");
  const gender = readStringParam(query, "gender");

  return {
    offset: readOffsetParam(query),
    search: readStringParam(query, "q"),
    // Values the backend would reject are dropped, since a 422 would break the page.
    team: team && team.length <= MAX_CLUB_LENGTH ? team : undefined,
    rating: RATING_OPTIONS.some((option) => option.value === rating) ? rating : undefined,
    gender: GENDER_OPTIONS.some((option) => option.value === gender) ? gender : undefined,
  };
}
