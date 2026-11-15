import { formatDateParam, parseDateParam } from "@/features/tournament/lib/date-param";

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
