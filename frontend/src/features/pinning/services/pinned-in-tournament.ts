import type { PinnedClub, PinnedItems, PinnedPool, PinnedTableau } from "@/features/pinning/types/pinning";

interface PinnedInTournament {
  clubs: PinnedClub[];
  pools: PinnedPool[];
  tableaus: PinnedTableau[];
}

const compare = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

function pinnedInTournament(pinned: PinnedItems, tournamentId?: string): PinnedInTournament {
  const inScope = <T extends { tournamentId: string }>(items: T[]) =>
    tournamentId ? items.filter((item) => item.tournamentId === tournamentId) : [...items];

  return {
    clubs: inScope(pinned.clubs).sort((a, b) => compare(a.name, b.name)),
    pools: inScope(pinned.pools).sort((a, b) => compare(a.eventName, b.eventName) || compare(a.title, b.title)),
    tableaus: inScope(pinned.tableaus).sort((a, b) => compare(a.eventName, b.eventName)),
  };
}

export { pinnedInTournament };
