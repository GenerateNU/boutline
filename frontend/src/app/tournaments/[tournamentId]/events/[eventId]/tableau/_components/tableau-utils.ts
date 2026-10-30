import type { TableauBout, TableauFencer, TableauRound } from "../../_types/tableau";

export function boutTitle(round: TableauRound, number: number): string {
  return round.bouts.length === 1 ? round.boutName : `${round.boutName} ${number}`;
}

export function fullName(fencer: TableauFencer): string {
  return `${fencer.firstName} ${fencer.lastName}`;
}

// A bout matches when either fencer's name or club contains the search text.
export function matchesQuery(bout: TableauBout, query: string): boolean {
  const search = query.trim().toLowerCase();
  if (search === "") {
    return true;
  }
  return [bout.top, bout.bottom].some(
    (fencer) =>
      fullName(fencer).toLowerCase().includes(search) ||
      fencer.club.toLowerCase().includes(search),
  );
}