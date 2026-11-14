import { parseFencerFilters } from "@/features/competitor/lib/fencer-filters";

describe("parseFencerFilters", () => {
  it.each([
    {
      name: "a valid weapon and ageCategory",
      query: { weapon: "foil", ageCategory: "cadet" },
      want: { offset: 0, search: "", team: undefined, rating: undefined, gender: undefined, weapon: "foil", ageCategory: "cadet" },
    },
    {
      name: "an unknown weapon value",
      query: { weapon: "quarterstaff" },
      want: { offset: 0, search: "", team: undefined, rating: undefined, gender: undefined, weapon: undefined, ageCategory: undefined },
    },
    {
      name: "an unknown ageCategory value",
      query: { ageCategory: "ancient" },
      want: { offset: 0, search: "", team: undefined, rating: undefined, gender: undefined, weapon: undefined, ageCategory: undefined },
    },
    {
      name: "a repeated-array weapon param",
      query: { weapon: ["foil", "sabre"] },
      want: { offset: 0, search: "", team: undefined, rating: undefined, gender: undefined, weapon: undefined, ageCategory: undefined },
    },
    {
      name: "an over-length team",
      query: { team: "a".repeat(121) },
      want: { offset: 0, search: "", team: undefined, rating: undefined, gender: undefined, weapon: undefined, ageCategory: undefined },
    },
    {
      name: "a non-numeric offset",
      query: { offset: "abc" },
      want: { offset: 0, search: "", team: undefined, rating: undefined, gender: undefined, weapon: undefined, ageCategory: undefined },
    },
    {
      name: "a negative offset",
      query: { offset: "-5" },
      want: { offset: 0, search: "", team: undefined, rating: undefined, gender: undefined, weapon: undefined, ageCategory: undefined },
    },
  ])("returns $name", ({ query, want }) => {
    expect(parseFencerFilters(query)).toEqual(want);
  });
});
