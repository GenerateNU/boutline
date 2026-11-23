import { poolingView } from "./pooling-view";

describe("poolingView", () => {
  it.each([
    { value: "results", want: "results" },
    { value: "pools", want: "pools" },
    { value: "", want: "pools" },
    { value: "Results", want: "pools" },
    { value: null, want: "pools" },
  ])("reads $value as $want", ({ value, want }) => {
    expect(poolingView(value)).toBe(want);
  });
});
