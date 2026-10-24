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
});
