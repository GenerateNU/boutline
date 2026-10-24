import type { TableauBout, TableauRound } from "../../_types/tableau";

export function boutTitle(round: TableauRound, number: number): string {
  return round.bouts.length === 1 ? round.boutName : `${round.boutName} ${number}`;
}

// A bout matches when either fencer's name or club contains the search text.
export function matchesQuery(bout: TableauBout, query: string): boolean {
  const search = query.trim().toLowerCase();
  if (search === "") {
    return true;
  }
  return [bout.top, bout.bottom].some(
    (fencer) =>
      fencer.name.toLowerCase().includes(search) ||
      fencer.club.toLowerCase().includes(search),
  );
}