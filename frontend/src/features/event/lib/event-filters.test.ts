import {
  eventFilterChips,
  matchesEventFilters,
  parseEventFilters,
} from "@/features/event/lib/event-filters";
import type { TournamentEvent } from "@/features/event/types/event";

const EVENT: TournamentEvent = {
  id: "e1",
  tournament_id: "t1",
  format: "pool_then_direct_elimination",
  name: "Women's Foil",
  status: "active",
  type: "individual",
  weapon: "foil",
  gender: "female",
  age_category: "senior",
  rating_limit: null,
  qualifier: false,
  start_time: null,
  started_at: null,
  completed_at: null,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
};

describe("parseEventFilters", () => {
  it.each([
    {
      name: "reads every valid value",
      query: { weapon: "foil", age: "y10", gender: "other", status: "ended", type: "team" },
      want: { weapon: "foil", age: "y10", gender: "other", status: "ended", type: "team" },
    },
    {
      name: "drops invalid and repeated values",
      query: { weapon: "laser", age: ["y8", "y10"], gender: "toString", status: "" },
      want: {},
    },
  ])("$name", ({ query, want }) => {
    expect(parseEventFilters(query)).toEqual(want);
  });
});

describe("matchesEventFilters", () => {
  it.each([
    { name: "no filters", filters: {}, want: true },
    { name: "all matching", filters: { weapon: "foil", gender: "female", status: "active" }, want: true },
    { name: "a wrong weapon", filters: { weapon: "sabre" }, want: false },
    { name: "a wrong age", filters: { age: "junior" }, want: false },
    { name: "a wrong type", filters: { type: "team" }, want: false },
    { name: "one wrong among matches", filters: { weapon: "foil", status: "ended" }, want: false },
  ] as const)("$name", ({ filters, want }) => {
    expect(matchesEventFilters(EVENT, filters)).toBe(want);
  });

  it("never matches an event with no value for an applied filter", () => {
    expect(matchesEventFilters({ ...EVENT, weapon: null }, { weapon: "foil" })).toBe(false);
  });
});

describe("eventFilterChips", () => {
  it("labels the applied filters in sheet order", () => {
    expect(eventFilterChips({ type: "team", gender: "other", weapon: "epee" })).toEqual([
      { param: "weapon", label: "Epee" },
      { param: "gender", label: "Mixed" },
      { param: "type", label: "Team" },
    ]);
  });

  it("is empty without filters", () => {
    expect(eventFilterChips({})).toEqual([]);
  });
});
