import { getFinalPlacings, getPoolResults } from "./results";

describe("getPoolResults", () => {
  it.each(getPoolResults().map((standing) => [standing.fencer.id, standing] as const))(
    "%s's totals match the pool bouts they list",
    (_, { bouts, victories, touchesScored, touchesReceived }) => {
      expect(bouts).toHaveLength(3);
      expect({ victories, touchesScored, touchesReceived }).toEqual({
        victories: bouts.filter((bout) => bout.touchesScored > bout.touchesReceived).length,
        touchesScored: bouts.reduce((sum, bout) => sum + bout.touchesScored, 0),
        touchesReceived: bouts.reduce((sum, bout) => sum + bout.touchesReceived, 0),
      });
    },
  );
});

describe("getFinalPlacings", () => {
  it("places every pool fencer once", () => {
    const placed = getFinalPlacings().map(({ standing }) => standing.fencer.id);

    expect(placed.toSorted()).toEqual(getPoolResults().map(({ fencer }) => fencer.id).toSorted());
  });
});
