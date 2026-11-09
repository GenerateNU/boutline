import type { TableauBout, TableauRound } from "../../_types/tableau";
import { boutTitle, matchesQuery } from "./tableau-utils";

const fencer = (firstName: string, lastName: string, club: string) => ({
  id: firstName,
  firstName,
  lastName,
  club,
  seed: 1,
});

const bout: TableauBout = {
  id: "b-1",
  number: 1,
  status: "upcoming",
  top: fencer("Maya", "Chen", "Boston Fencing Club"),
  bottom: fencer("Ana", "Silva", ""),
  topScore: undefined,
  bottomScore: undefined,
};

const round = (size: number, bouts: TableauBout[]): TableauRound => ({
  id: String(size),
  size,
  name: "Round",
  boutName: "Bout",
  bouts,
});

describe("matchesQuery", () => {
  it.each([
    { name: "empty search", query: "  ", want: true },
    { name: "a fencer name", query: "silva", want: true },
    { name: "a club", query: "boston", want: true },
    { name: "no match", query: "zzz", want: false },
  ])("with $name", ({ query, want }) => {
    expect(matchesQuery(bout, query)).toBe(want);
  });
});

describe("boutTitle", () => {
  it.each([
    { name: "the final, before its bout exists", size: 2, bouts: [], want: "Bout" },
    { name: "a round with a single bout so far", size: 8, bouts: [bout], want: "Bout 3" },
    { name: "a round of many bouts", size: 16, bouts: [bout, bout], want: "Bout 3" },
  ])("names $name", ({ size, bouts, want }) => {
    expect(boutTitle(round(size, bouts), 3)).toBe(want);
  });
});
