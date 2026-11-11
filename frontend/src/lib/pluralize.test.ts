import { pluralize } from "@/lib/pluralize";

describe("pluralize", () => {
  it.each([
    { count: 0, singular: "event", plural: undefined, want: "events" },
    { count: 1, singular: "event", plural: undefined, want: "event" },
    { count: 12, singular: "event", plural: undefined, want: "events" },
    { count: 1, singular: "match", plural: undefined, want: "match" },
    { count: 3, singular: "match", plural: undefined, want: "matches" },
    { count: 2, singular: "class", plural: undefined, want: "classes" },
    { count: 2, singular: "box", plural: undefined, want: "boxes" },
    { count: 2, singular: "category", plural: undefined, want: "categories" },
    { count: 2, singular: "day", plural: undefined, want: "days" },
    { count: 2, singular: "person", plural: "people", want: "people" },
  ])("$count $singular → $want", ({ count, singular, plural, want }) => {
    expect(pluralize(count, singular, plural)).toBe(want);
  });
});
