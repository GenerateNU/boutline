import { parseFencerFilters } from "@/features/competitor/lib/fencer-filters";

describe("parseFencerFilters", () => {
  it.each([
    {
      name: "a valid weapon and ageCategory",
      query: { weapon: "foil", ageCategory: "cadet" },
      want: { search: "", team: undefined, rating: undefined, gender: undefined, weapon: "foil", ageCategory: "cadet" },
    },
    {
      name: "an unknown weapon value",
      query: { weapon: "quarterstaff" },
      want: { search: "", team: undefined, rating: undefined, gender: undefined, weapon: undefined, ageCategory: undefined },
    },
    {
      name: "an unknown ageCategory value",
      query: { ageCategory: "ancient" },
      want: { search: "", team: undefined, rating: undefined, gender: undefined, weapon: undefined, ageCategory: undefined },
    },
    {
      name: "a repeated-array weapon param",
      query: { weapon: ["foil", "sabre"] },
      want: { search: "", team: undefined, rating: undefined, gender: undefined, weapon: undefined, ageCategory: undefined },
    },
    {
      name: "an over-length team",
      query: { team: "a".repeat(121) },
      want: { search: "", team: undefined, rating: undefined, gender: undefined, weapon: undefined, ageCategory: undefined },
    },
  ])("returns $name", ({ query, want }) => {
    expect(parseFencerFilters(query)).toEqual(want);
  });
});
