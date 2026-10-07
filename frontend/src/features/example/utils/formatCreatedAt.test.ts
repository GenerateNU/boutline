import { formatCreatedAt } from "@/features/example/utils/formatCreatedAt";

describe("formatCreatedAt", () => {
  it.each([
    ["2026-10-01T12:00:00Z", "Oct 1, 2026"],
    ["2026-12-31T23:59:59Z", "Dec 31, 2026"],
  ])("formats %s as %s", (iso, expected) => {
    expect(formatCreatedAt(iso)).toBe(expected);
  });
});
