import type { TableauBout, TableauRound } from "../../_types/tableau";
import { latestMatchingRoundId } from "./latest-matching-round";

const bout = (firstName: string, lastName: string): TableauBout => ({
  id: firstName,
  number: 1,
  status: "ended",
  top: { id: firstName, firstName, lastName, club: "", seed: 1 },
  bottom: { id: "x", firstName: "Zed", lastName: "Other", club: "", seed: 2 },
});

const round = (size: number, bouts: TableauBout[]): TableauRound => ({
  id: String(size),
  size,
  name: "Round",
  boutName: "Bout",
  bouts,
});

const ROUNDS = [
  round(8, [bout("Maya", "Chen"), bout("Ana", "Silva")]),
  round(4, [bout("Maya", "Chen")]),
  round(2, []),
];

describe("latestMatchingRoundId", () => {
  it.each([
    { name: "a fencer in two rounds", query: "maya", want: "4" },
    { name: "a fencer in one round", query: "silva", want: "8" },
    { name: "no match", query: "nobody", want: undefined },
    { name: "an empty search", query: " ", want: undefined },
  ])("with $name", ({ query, want }) => {
    expect(latestMatchingRoundId(ROUNDS, query)).toBe(want);
  });
});
