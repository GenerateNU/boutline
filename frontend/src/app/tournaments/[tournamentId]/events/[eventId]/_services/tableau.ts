import type { Tableau, TableauFencer, TableauRound } from "../_types/tableau";
import { bouts } from "./bouts";

// The tableau rounds in the seed data, in bracket order. `round` matches Bout.round.
const roundOrder = [
  { round: "Semifinal", name: "Semi-finals", boutName: "Semi-final" },
  { round: "Final", name: "Finals", boutName: "Final" },
];

// The seed data has no seeds; these follow its semifinal pairings (1 v 4, 2 v 3).
const placeholderSeeds: Record<string, number> = {
  "Maya Chen": 1,
  "Hana Sato": 2,
  "Sofia Rossi": 3,
  "Kenji Tanaka": 4,
};

function toTableauFencer(fencer: { name: string; club: string }): TableauFencer {
  const seed = placeholderSeeds[fencer.name];
  if (seed === undefined) {
    throw new Error(`No placeholder seed for ${fencer.name}`);
  }
  // The seed data has one name string and no IDs, so it's split on the first space and
  // the name stands in for the ID.
  const [firstName, ...rest] = fencer.name.split(" ");
  return { id: fencer.name, firstName, lastName: rest.join(" "), club: fencer.club, seed };
}

// TODO: replace with a request to the actual tableau endpoint once it's implemented
export async function getTableau(eventId: string): Promise<Tableau> {
  void eventId;

  const tableauBouts = bouts.filter((bout) => bout.stage === "tableau");
  if (tableauBouts.length === 0) {
    return { rounds: [] };
  }

  const rounds: TableauRound[] = roundOrder.map(({ round, name, boutName }) => ({
    id: round,
    name,
    boutName,
    bouts: tableauBouts
      .filter((bout) => bout.round === round)
      .map((bout, index) => {
        const fenced = bout.audit.length > 0;
        return {
          id: bout.id,
          number: index + 1,
          top: toTableauFencer(bout.left),
          bottom: toTableauFencer(bout.right),
          topScore: fenced ? bout.left.score : undefined,
          bottomScore: fenced ? bout.right.score : undefined,
        };
      }),
  }));

  return { rounds };
}