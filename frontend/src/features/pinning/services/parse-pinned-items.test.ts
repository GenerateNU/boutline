import { parsePinnedItems } from "@/features/pinning/services/parse-pinned-items";

const CLUB = { tournamentId: "t1", name: "Salle" };
const EMPTY = { fencerIds: [], clubs: [], pools: [], tableaus: [] };

describe("parsePinnedItems", () => {
  it.each([
    ["null", null],
    ["a string", "x"],
    ["a number", 3],
    ["undefined", undefined],
  ])("returns all-empty for %s", (_name, value) => {
    expect(parsePinnedItems(value)).toEqual(EMPTY);
  });

  it.each([
    ["fencers and bouts", { fencerIds: ["a"], boutIds: ["b"] }],
    ["fencers, bouts and pools", { fencerIds: ["a"], boutIds: ["b"], poolIds: ["p"] }],
  ])("keeps only fencerIds from legacy %s", (_name, value) => {
    expect(parsePinnedItems(value)).toEqual({ ...EMPTY, fencerIds: ["a"] });
  });

  it("round-trips the current shape and returns arrays by reference", () => {
    const stored = { fencerIds: ["a"], clubs: [CLUB], pools: [], tableaus: [] };
    const parsed = parsePinnedItems(stored);
    expect(parsed).toEqual(stored);
    expect(parsed.fencerIds).toBe(stored.fencerIds);
    expect(parsed.clubs).toBe(stored.clubs);
  });

  it("turns a non-array field into an empty array", () => {
    expect(parsePinnedItems({ fencerIds: "a", clubs: [CLUB] })).toEqual({
      ...EMPTY,
      clubs: [CLUB],
    });
  });
});
