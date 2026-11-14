import { clamp } from "@/utils/clamp";

describe("clamp", () => {
  it.each([
    { value: 5, min: 0, max: 10, expected: 5 },
    { value: -3, min: 0, max: 10, expected: 0 },
    { value: 12, min: 0, max: 10, expected: 10 },
    { value: -400, min: -300, max: 300, expected: -300 },
  ])("clamps $value into [$min, $max]", ({ value, min, max, expected }) => {
    expect(clamp(value, min, max)).toBe(expected);
  });
});
