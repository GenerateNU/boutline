import { ratingLabel } from "@/features/competitor/lib/rating-label";

describe("ratingLabel", () => {
  it.each([
    ["A", null, "A"],
    ["A", undefined, "A"],
    ["A", 26, "A26"],
    ["B", 5, "B05"],
  ])("%s with year %s is %s", (rating, year, expected) => {
    expect(ratingLabel(rating, year)).toBe(expected);
  });
});
