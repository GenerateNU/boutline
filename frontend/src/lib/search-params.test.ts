import { readOffsetParam, readStringParam } from "@/lib/search-params";

describe("readStringParam", () => {
  it.each([
    { name: "a trimmed value", query: { q: "  epee " }, want: "epee" },
    { name: "an absent key", query: {}, want: "" },
    { name: "a repeated key", query: { q: ["a", "b"] }, want: "" },
  ])("returns $name", ({ query, want }) => {
    expect(readStringParam(query, "q")).toBe(want);
  });
});

describe("readOffsetParam", () => {
  it.each([
    { name: "a valid offset", query: { offset: "40" }, want: 40 },
    { name: "zero for a negative offset", query: { offset: "-5" }, want: 0 },
    { name: "zero for a non-number", query: { offset: "abc" }, want: 0 },
    { name: "zero when absent", query: {}, want: 0 },
    { name: "zero for a fraction", query: { offset: "1.5" }, want: 0 },
    { name: "zero for infinity", query: { offset: "Infinity" }, want: 0 },
  ])("returns $name", ({ query, want }) => {
    expect(readOffsetParam(query)).toBe(want);
  });
});
