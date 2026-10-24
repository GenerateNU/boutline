import type { TournamentEvent } from "@/features/event/types/event";
import {
  dayWindow,
  eventDay,
  eventDays,
  eventsWithStatus,
  formatDayLabel,
  formatEventDateRange,
  formatTimeLabel,
  scheduleForDay,
  selectEventDay,
} from "@/lib/event-schedule";

describe("eventDay", () => {
  it.each([
    { name: "a UTC instant", input: "2026-10-05T09:00:00Z", want: "2026-10-05" },
    { name: "an offset that crosses into the next UTC day", input: "2026-10-05T23:30:00-04:00", want: "2026-10-06" },
  ])("$name", ({ input, want }) => {
    expect(eventDay(input)).toBe(want);
  });
});

describe("eventDays", () => {
  it("dedupes, sorts ascending, and skips undated events", () => {
    const events = [
      { start_time: "2026-10-06T09:00:00Z" },
      { start_time: null },
      { start_time: "2026-10-05T15:00:00Z" },
      { start_time: "2026-10-06T13:00:00Z" },
    ];

    expect(eventDays(events)).toEqual(["2026-10-05", "2026-10-06"]);
  });
});

describe("selectEventDay", () => {
  const days = ["2026-10-05", "2026-10-06", "2026-10-07"];

  it.each([
    { name: "a requested day in range", days, requested: "2026-10-06", today: "2026-10-01", want: "2026-10-06" },
    { name: "a requested day not in range", days, requested: "2026-12-25", today: "2026-10-06", want: "2026-10-06" },
    { name: "a malformed requested day", days, requested: "nonsense", today: "2026-10-06", want: "2026-10-06" },
    { name: "today inside the range", days, requested: undefined, today: "2026-10-06", want: "2026-10-06" },
    { name: "today between days", days: ["2026-10-05", "2026-10-07"], requested: undefined, today: "2026-10-06", want: "2026-10-07" },
    { name: "today before all days", days, requested: undefined, today: "2026-09-01", want: "2026-10-05" },
    { name: "today after all days", days, requested: undefined, today: "2026-11-01", want: "2026-10-07" },
    { name: "no days", days: [], requested: "2026-10-05", today: "2026-10-05", want: null },
  ])("$name", ({ days, requested, today, want }) => {
    expect(selectEventDay(days, requested, today)).toBe(want);
  });
});

describe("dayWindow", () => {
  const days = ["d1", "d2", "d3", "d4", "d5", "d6", "d7"];

  it.each([
    { name: "selected at the start", days, selected: "d1", size: 5, want: ["d1", "d2", "d3", "d4", "d5"] },
    { name: "selected in the middle", days, selected: "d4", size: 5, want: ["d2", "d3", "d4", "d5", "d6"] },
    { name: "selected at the end", days, selected: "d7", size: 5, want: ["d3", "d4", "d5", "d6", "d7"] },
    { name: "fewer days than the window", days: ["d1", "d2"], selected: "d2", size: 5, want: ["d1", "d2"] },
  ])("$name", ({ days, selected, size, want }) => {
    expect(dayWindow(days, selected, size)).toEqual(want);
  });
});

function makeEvent(id: string, name: string, start_time: string | null): TournamentEvent {
  return {
    id,
    tournament_id: "t1",
    format: "pool_then_direct_elimination",
    name,
    status: "upcoming",
    start_time,
    started_at: null,
    completed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

const summarize = (groups: ReturnType<typeof scheduleForDay>) =>
  groups.map((g) => ({ startTime: g.startTime, ids: g.events.map((e) => e.id) }));

describe("scheduleForDay", () => {
  const events = [
    makeEvent("a", "Men's Foil", "2026-10-05T09:00:00Z"),
    makeEvent("b", "Women's Foil", "2026-10-05T09:00:00Z"),
    makeEvent("c", "Mixed Épée", "2026-10-05T09:30:00Z"),
    makeEvent("d", "Men's Sabre", "2026-10-06T10:00:00Z"),
    makeEvent("e", "Open Demo", null),
  ];

  it.each([
    {
      name: "keeps the day's events, groups by instant, and puts undated last",
      day: "2026-10-05",
      search: "",
      want: [
        { startTime: "2026-10-05T09:00:00.000Z", ids: ["a", "b"] },
        { startTime: "2026-10-05T09:30:00.000Z", ids: ["c"] },
        { startTime: null, ids: ["e"] },
      ],
    },
    {
      name: "shows undated events on every day",
      day: "2026-10-06",
      search: "",
      want: [
        { startTime: "2026-10-06T10:00:00.000Z", ids: ["d"] },
        { startTime: null, ids: ["e"] },
      ],
    },
    {
      name: "returns only undated events when no day is selected",
      day: null,
      search: "",
      want: [{ startTime: null, ids: ["e"] }],
    },
    {
      name: "matches search ignoring accents",
      day: "2026-10-05",
      search: "epee",
      want: [{ startTime: "2026-10-05T09:30:00.000Z", ids: ["c"] }],
    },
    {
      name: "matches search ignoring case",
      day: "2026-10-05",
      search: "WOMEN",
      want: [{ startTime: "2026-10-05T09:00:00.000Z", ids: ["b"] }],
    },
    { name: "returns nothing when search matches no event", day: "2026-10-05", search: "zzz", want: [] },
  ])("$name", ({ day, search, want }) => {
    expect(summarize(scheduleForDay(events, day, search))).toEqual(want);
  });

  it("sorts groups ascending and events by name then id", () => {
    const unsorted = [
      makeEvent("z2", "Alpha", "2026-10-05T11:00:00Z"),
      makeEvent("z1", "Alpha", "2026-10-05T11:00:00Z"),
      makeEvent("y", "Beta", "2026-10-05T11:00:00Z"),
      makeEvent("x", "Zulu", "2026-10-05T08:00:00Z"),
    ];

    expect(summarize(scheduleForDay(unsorted, "2026-10-05", ""))).toEqual([
      { startTime: "2026-10-05T08:00:00.000Z", ids: ["x"] },
      { startTime: "2026-10-05T11:00:00.000Z", ids: ["z1", "z2", "y"] },
    ]);
  });

  it("groups the same instant written with different offsets together", () => {
    const mixed = [
      makeEvent("a", "Foil", "2026-10-05T09:00:00Z"),
      makeEvent("b", "Sabre", "2026-10-05T05:00:00-04:00"),
    ];

    expect(summarize(scheduleForDay(mixed, "2026-10-05", ""))).toEqual([
      { startTime: "2026-10-05T09:00:00.000Z", ids: ["a", "b"] },
    ]);
  });
});

const normalize = (label: string) => label.replace(/\s/g, " ");

describe("formatDayLabel", () => {
  it.each([
    { name: "a single-digit day", day: "2026-10-05", want: "Oct 5" },
    { name: "a double-digit day", day: "2026-12-25", want: "Dec 25" },
  ])("$name", ({ day, want }) => {
    expect(normalize(formatDayLabel(day))).toBe(want);
  });
});

describe("formatEventDateRange", () => {
  it.each([
    {
      name: "two days",
      events: [{ start_time: "2026-10-13T09:00:00Z" }, { start_time: "2026-10-12T09:00:00Z" }],
      fallback: null,
      want: "October 12 – October 13",
    },
    {
      name: "a single day with several events",
      events: [{ start_time: "2026-10-12T09:00:00Z" }, { start_time: "2026-10-12T15:00:00Z" }],
      fallback: null,
      want: "October 12",
    },
    {
      name: "undated events ignored",
      events: [{ start_time: null }, { start_time: "2026-10-12T09:00:00Z" }],
      fallback: "2026-11-01T09:00:00Z",
      want: "October 12",
    },
    { name: "no dated events with a fallback", events: [{ start_time: null }], fallback: "2026-10-12T09:00:00Z", want: "October 12" },
    { name: "nothing at all", events: [], fallback: null, want: null },
    {
      name: "an offset that crosses into the next UTC day",
      events: [{ start_time: "2026-10-12T23:30:00-04:00" }],
      fallback: null,
      want: "October 13",
    },
  ])("$name", ({ events, fallback, want }) => {
    const got = formatEventDateRange(events, fallback);
    expect(got === null ? got : normalize(got)).toBe(want);
  });
});

describe("eventsWithStatus", () => {
  const upcoming = (id: string, name: string, start: string | null) => makeEvent(id, name, start);
  const active = (id: string) => ({ ...makeEvent(id, "Active", "2026-10-05T08:00:00Z"), status: "active" as const });

  it.each([
    {
      name: "filters out other statuses",
      events: [upcoming("a", "A", "2026-10-05T09:00:00Z"), active("b")],
      want: ["a"],
    },
    {
      name: "sorts ascending by instant, including offset inputs",
      events: [
        upcoming("late", "A", "2026-10-05T10:00:00Z"),
        upcoming("early", "B", "2026-10-05T05:00:00-04:00"),
        upcoming("earliest", "C", "2026-10-05T08:00:00Z"),
      ],
      want: ["earliest", "early", "late"],
    },
    {
      name: "puts undated last",
      events: [upcoming("u", "A", null), upcoming("d", "B", "2026-10-05T09:00:00Z")],
      want: ["d", "u"],
    },
    {
      name: "breaks ties by name then id",
      events: [
        upcoming("z2", "Alpha", "2026-10-05T09:00:00Z"),
        upcoming("y", "Beta", "2026-10-05T09:00:00Z"),
        upcoming("z1", "Alpha", "2026-10-05T09:00:00Z"),
      ],
      want: ["z1", "z2", "y"],
    },
  ])("$name", ({ events, want }) => {
    expect(eventsWithStatus(events, "upcoming").map((e) => e.id)).toEqual(want);
  });

  it("leaves the input array unmodified", () => {
    const events = [upcoming("b", "B", "2026-10-06T09:00:00Z"), upcoming("a", "A", "2026-10-05T09:00:00Z")];

    eventsWithStatus(events, "upcoming");

    expect(events.map((e) => e.id)).toEqual(["b", "a"]);
  });
});

describe("formatTimeLabel", () => {
  it.each([
    { name: "morning", startTime: "2026-10-05T09:00:00Z", want: "9:00 AM" },
    { name: "half hour", startTime: "2026-10-05T09:30:00Z", want: "9:30 AM" },
    { name: "afternoon", startTime: "2026-10-05T15:05:00Z", want: "3:05 PM" },
    { name: "an offset input shown in UTC", startTime: "2026-10-05T09:00:00-04:00", want: "1:00 PM" },
  ])("$name", ({ startTime, want }) => {
    expect(normalize(formatTimeLabel(startTime))).toBe(want);
  });
});
