import { parseTournamentFilters } from "@/features/tournament/lib/tournament-filters";

describe("parseTournamentFilters", () => {
  // 03:00 UTC on Nov 15 is still the evening of Nov 14 in New York.
  beforeAll(() => {
    jest.useFakeTimers({ now: new Date("2026-11-15T03:00:00Z") });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it.each([
    {
      name: "empty params",
      query: {},
      want: {
        offset: 0,
        status: undefined,
        date: "2026-11-15",
        search: "",
        tz: undefined,
      },
    },
    {
      name: "a missing date with a time zone",
      query: { tz: "America/New_York" },
      want: { date: "2026-11-14", tz: "America/New_York" },
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
        date: "2026-11-15",
        search: "",
        tz: undefined,
      },
    },
    {
      name: "a deselected date",
      query: { date: "all", tz: "America/New_York" },
      want: { date: undefined },
    },
  ])("parses $name", ({ query, want }) => {
    expect(parseTournamentFilters(query)).toMatchObject(want);
  });

  it.each([
    { name: "a trimmed club", query: { club: " Allez Fencing " }, want: { club: "Allez Fencing", country: undefined } },
    { name: "a club at the length limit", query: { club: "a".repeat(120) }, want: { club: "a".repeat(120), country: undefined } },
    { name: "a too-long club", query: { club: "a".repeat(121) }, want: { club: undefined, country: undefined } },
    { name: "a valid country", query: { country: "CA" }, want: { club: undefined, country: "CA" } },
    { name: "a lowercase country", query: { country: "ca" }, want: { club: undefined, country: undefined } },
    { name: "a too-long country", query: { country: "ZZZ" }, want: { club: undefined, country: undefined } },
    { name: "an array country", query: { country: ["CA", "US"] }, want: { club: undefined, country: undefined } },
  ])("parses club and country for $name", ({ query, want }) => {
    expect(parseTournamentFilters(query)).toMatchObject(want);
  });
});
