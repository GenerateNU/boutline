import { parseTournamentFilters } from "@/features/tournament/lib/tournament-filters";

describe("parseTournamentFilters", () => {
  it.each([
    {
      name: "empty params",
      query: {},
      want: {
        offset: 0,
        status: undefined,
        date: undefined,
        calendarView: false,
        search: "",
        tz: undefined,
      },
    },
    {
      name: "valid params",
      query: {
        offset: "40",
        status: "active",
        date: "2026-10-05",
        q: " open ",
        tz: "America/New_York",
      },
      want: {
        offset: 40,
        status: "active",
        date: "2026-10-05",
        calendarView: false,
        search: "open",
        tz: "America/New_York",
      },
    },
    {
      name: "invalid params",
      query: {
        offset: "-5",
        status: "bogus",
        date: "2026-02-31",
        q: ["a", "b"],
        tz: ["x", "y"],
      },
      want: {
        offset: 0,
        status: undefined,
        date: undefined,
        calendarView: false,
        search: "",
        tz: undefined,
      },
    },
    {
      name: "calendar view drops the search",
      query: { view: "calendar", q: "open" },
      want: {
        offset: 0,
        status: undefined,
        date: undefined,
        calendarView: true,
        search: "",
        tz: undefined,
      },
    },
  ])("parses $name", ({ query, want }) => {
    expect(parseTournamentFilters(query)).toMatchObject(want);
  });

  it.each([
    { name: "a trimmed club", query: { club: " Allez Fencing " }, want: { club: "Allez Fencing", country: undefined } },
    { name: "a valid country", query: { country: "CA" }, want: { club: undefined, country: "CA" } },
    { name: "a lowercase country", query: { country: "ca" }, want: { club: undefined, country: undefined } },
    { name: "a too-long country", query: { country: "ZZZ" }, want: { club: undefined, country: undefined } },
    { name: "an array country", query: { country: ["CA", "US"] }, want: { club: undefined, country: undefined } },
  ])("parses club and country for $name", ({ query, want }) => {
    expect(parseTournamentFilters(query)).toMatchObject(want);
  });
});
