import {
  formatDateParam,
  parseDateParam,
  todayDateParam,
} from "@/features/tournament/lib/date-param";

describe("parseDateParam", () => {
  it.each([
    { name: "a valid day", value: "2026-10-05", want: "2026-10-05" },
    { name: "a missing value", value: undefined, want: undefined },
    { name: "an empty string", value: "", want: undefined },
    { name: "a malformed value", value: "not-a-date", want: undefined },
    { name: "an impossible day", value: "2026-02-31", want: undefined },
  ])("returns $want for $name", ({ value, want }) => {
    const date = parseDateParam(value);
    expect(date && formatDateParam(date)).toBe(want);
  });
});

describe("todayDateParam", () => {
  const NOW = new Date("2026-11-15T03:00:00Z");

  it.each([
    { name: "no time zone", timeZone: undefined, want: "2026-11-15" },
    { name: "a zone behind UTC", timeZone: "America/New_York", want: "2026-11-14" },
    { name: "an unknown zone", timeZone: "Not/AZone", want: "2026-11-15" },
  ])("returns $want for $name", ({ timeZone, want }) => {
    expect(todayDateParam(timeZone, NOW)).toBe(want);
  });
});
