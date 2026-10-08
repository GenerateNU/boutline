import { clamp } from "@/features/example/utils/clamp";

describe("clamp", () => {
  it.each([
    [5, 5],
    [-1, 0],
    [11, 10],
    [0, 0],
    [10, 10],
  ])("clamps %i into [0, 10] as %i", (value, expected) => {
    expect(clamp(value, 0, 10)).toBe(expected);
  });
});
