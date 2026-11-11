import { pluralize } from "@/lib/pluralize";

describe("pluralize", () => {
  it.each([
    { count: 0, singular: "event", plural: undefined, want: "0 events" },
    { count: 1, singular: "event", plural: undefined, want: "1 event" },
    { count: 12, singular: "event", plural: undefined, want: "12 events" },
    { count: 1, singular: "match", plural: "matches", want: "1 match" },
    { count: 3, singular: "match", plural: "matches", want: "3 matches" },
  ])("$count $singular → $want", ({ count, singular, plural, want }) => {
    expect(pluralize(count, singular, plural)).toBe(want);
  });
});
