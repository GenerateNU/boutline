import { dayRange } from "@/features/tournament/lib/day-range";

describe("dayRange", () => {
  it.each([
    ["UTC", "2026-10-23", "UTC", "2026-10-23T00:00:00.000Z", "2026-10-24T00:00:00.000Z"],
    ["New York", "2026-10-23", "America/New_York", "2026-10-23T04:00:00.000Z", "2026-10-24T04:00:00.000Z"],
    ["spring-forward 23h day", "2026-03-08", "America/New_York", "2026-03-08T05:00:00.000Z", "2026-03-09T04:00:00.000Z"],
    ["fall-back 25h day", "2026-11-01", "America/New_York", "2026-11-01T04:00:00.000Z", "2026-11-02T05:00:00.000Z"],
    ["half-hour offset", "2026-10-23", "Asia/Kolkata", "2026-10-22T18:30:00.000Z", "2026-10-23T18:30:00.000Z"],
    ["missing zone", "2026-10-23", undefined, "2026-10-23T00:00:00.000Z", "2026-10-24T00:00:00.000Z"],
    ["invalid zone", "2026-10-23", "Not/AZone", "2026-10-23T00:00:00.000Z", "2026-10-24T00:00:00.000Z"],
  ])("%s", (_name, date, timeZone, from, to) => {
    const range = dayRange(date, timeZone);

    expect(range.from.toISOString()).toBe(from);
    expect(range.to.toISOString()).toBe(to);
  });
});
