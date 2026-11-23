import type { ResultFencer, ResultStatus } from "../_types/results";
import { splitQualifying } from "./split-qualifying";

const fencer = (id: string, place: number, status: ResultStatus): ResultFencer => ({
  id,
  firstName: "First",
  lastName: id,
  club: "",
  rating: "U",
  place,
  pool: 1,
  strip: null,
  status,
});

const ids = (fencers: ResultFencer[]) => fencers.map((f) => f.id);

describe("splitQualifying", () => {
  it.each([
    { name: "empty input", input: [], drawn: false, percent: 0, qualifiers: [], disqualifiers: [] },
    {
      name: "all pending",
      input: [fencer("a", 1, "pending"), fencer("b", 2, "pending")],
      drawn: false,
      percent: 0,
      qualifiers: [],
      disqualifiers: [],
    },
    {
      name: "two advanced and one eliminated",
      input: [fencer("a", 1, "advanced"), fencer("b", 2, "advanced"), fencer("c", 3, "eliminated")],
      drawn: true,
      percent: 67,
      qualifiers: ["a", "b"],
      disqualifiers: ["c"],
    },
    {
      name: "all advanced",
      input: [fencer("a", 1, "advanced"), fencer("b", 2, "advanced")],
      drawn: true,
      percent: 100,
      qualifiers: ["a", "b"],
      disqualifiers: [],
    },
  ])("splits $name", ({ input, drawn, percent, qualifiers, disqualifiers }) => {
    const result = splitQualifying(input);

    expect(result.drawn).toBe(drawn);
    expect(result.qualifiedPercent).toBe(percent);
    expect(ids(result.qualifiers)).toEqual(qualifiers);
    expect(ids(result.disqualifiers)).toEqual(disqualifiers);
  });
});
