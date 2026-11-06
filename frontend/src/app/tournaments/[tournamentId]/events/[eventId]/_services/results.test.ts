import { getFinalPlacings, getPoolResults } from "./results";

describe("getPoolResults", () => {
  it("ranks by V/M, then indicator, then touches scored, and cuts after eight", () => {
    expect(getPoolResults().map(({ fencer, advanced }) => [fencer.id, advanced])).toEqual([
      ["maya", true],
      ["hana", true],
      ["kenji", true],
      ["amara", true],
      ["sofia", true],
      ["priya", true],
      ["liam", true],
      ["noah", true],
      ["leila", false],
      ["marcus", false],
      ["ethan", false],
      ["diego", false],
    ]);
  });

  it.each([
    { id: "maya", pool: 1, poolPlace: 1, victories: 3, touchesScored: 15, touchesReceived: 6 },
    { id: "amara", pool: 2, poolPlace: 2, victories: 2, touchesScored: 14, touchesReceived: 8 },
    { id: "marcus", pool: 3, poolPlace: 4, victories: 0, touchesScored: 10, touchesReceived: 15 },
  ])("totals $id's pool bouts", ({ id, ...want }) => {
    const standing = getPoolResults().find(({ fencer }) => fencer.id === id);

    expect(standing).toMatchObject(want);
    expect(standing?.bouts).toHaveLength(3);
  });
});

describe("getFinalPlacings", () => {
  it("places the DE first, shares third, then the cut in pool order", () => {
    const placings = getFinalPlacings(getPoolResults());

    expect(placings.map(({ place, standing }) => [standing.fencer.id, place])).toEqual([
      ["maya", 1],
      ["hana", 2],
      ["kenji", 3],
      ["sofia", 3],
      ["amara", 5],
      ["priya", 6],
      ["liam", 7],
      ["noah", 8],
      ["leila", 9],
      ["marcus", 10],
      ["ethan", 11],
      ["diego", 12],
    ]);
  });
});
