import type { FinalPlacing, PoolStanding, ResultFencer } from "../_types/results";

// Placeholder until the pool and event results endpoints exist (§11.3, §13.1).
// Same fencers as the seeded bouts, in three pools of four.
const fencer = (
  id: string,
  firstName: string,
  lastName: string,
  club: string,
  rating: string,
): ResultFencer => ({ id, firstName, lastName, club, rating });

const MAYA = fencer("maya", "Maya", "Chen", "Boston Fencing Club", "A26");
const LIAM = fencer("liam", "Liam", "O'Brien", "Northeastern Fencing", "B25");
const PRIYA = fencer("priya", "Priya", "Patel", "Cambridge FC", "B26");
const DIEGO = fencer("diego", "Diego", "Martinez", "", "U");
const HANA = fencer("hana", "Hana", "Sato", "Northeastern Fencing", "A25");
const NOAH = fencer("noah", "Noah", "Williams", "Boston Fencing Club", "C26");
const AMARA = fencer("amara", "Amara", "Okafor", "Cambridge FC", "B24");
const ETHAN = fencer("ethan", "Ethan", "Kowalski", "", "E25");
const SOFIA = fencer("sofia", "Sofia", "Rossi", "Boston Fencing Club", "A24");
const KENJI = fencer("kenji", "Kenji", "Tanaka", "Northeastern Fencing", "A26");
const LEILA = fencer("leila", "Leila", "Haddad", "Cambridge FC", "D25");
const MARCUS = fencer("marcus", "Marcus", "Johnson", "", "U");

type PoolBout = [ResultFencer, number, ResultFencer, number];

const pools: PoolBout[][] = [
  [
    [MAYA, 5, LIAM, 2],
    [PRIYA, 3, MAYA, 5],
    [MAYA, 5, DIEGO, 1],
    [PRIYA, 5, LIAM, 4],
    [DIEGO, 2, PRIYA, 5],
    [LIAM, 5, DIEGO, 3],
  ],
  [
    [HANA, 5, NOAH, 1],
    [AMARA, 4, HANA, 5],
    [HANA, 5, ETHAN, 3],
    [AMARA, 5, NOAH, 3],
    [ETHAN, 0, AMARA, 5],
    [NOAH, 5, ETHAN, 4],
  ],
  [
    [KENJI, 5, SOFIA, 4],
    [LEILA, 2, KENJI, 5],
    [KENJI, 5, MARCUS, 3],
    [SOFIA, 5, LEILA, 1],
    [MARCUS, 3, SOFIA, 5],
    [LEILA, 5, MARCUS, 4],
  ],
];

// Finishing order of the eight who made the cut.
const dePlaces: [ResultFencer, number][] = [
  [MAYA, 1],
  [HANA, 2],
  [KENJI, 3],
  [SOFIA, 3],
  [AMARA, 5],
  [PRIYA, 6],
  [LIAM, 7],
  [NOAH, 8],
];

type PoolRecord = Omit<PoolStanding, "poolPlace" | "advanced">;

// Same order as the backend ranking: V/M, then indicator, then touches scored.
function byRanking(a: PoolRecord, b: PoolRecord) {
  return (
    b.victories / b.bouts.length - a.victories / a.bouts.length ||
    b.touchesScored - b.touchesReceived - (a.touchesScored - a.touchesReceived) ||
    b.touchesScored - a.touchesScored
  );
}

function poolRecord(bouts: PoolBout[], pool: number, fencer: ResultFencer): PoolRecord {
  const results = bouts
    .filter(([left, , right]) => left === fencer || right === fencer)
    .map(([left, leftScore, right, rightScore]) =>
      left === fencer
        ? { opponent: right, touchesScored: leftScore, touchesReceived: rightScore }
        : { opponent: left, touchesScored: rightScore, touchesReceived: leftScore },
    );

  return {
    fencer,
    pool,
    victories: results.filter((bout) => bout.touchesScored > bout.touchesReceived).length,
    touchesScored: results.reduce((sum, bout) => sum + bout.touchesScored, 0),
    touchesReceived: results.reduce((sum, bout) => sum + bout.touchesReceived, 0),
    bouts: results,
  };
}

function rankPool(bouts: PoolBout[], pool: number) {
  const fencers = new Set(bouts.flatMap(([left, , right]) => [left, right]));
  return [...fencers]
    .map((fencer) => poolRecord(bouts, pool, fencer))
    .sort(byRanking)
    .map((record, index) => ({ ...record, poolPlace: index + 1 }));
}

export function getPoolResults(): PoolStanding[] {
  return pools
    .flatMap((bouts, index) => rankPool(bouts, index + 1))
    .sort(byRanking)
    .map((standing, index) => ({ ...standing, advanced: index < dePlaces.length }));
}

// Fencers cut after pools place below the DE, in pool ranking order.
export function getFinalPlacings(standings: PoolStanding[]): FinalPlacing[] {
  const placed = dePlaces.map(([fencer, place]) => ({
    place,
    standing: standings.find((standing) => standing.fencer === fencer)!,
  }));
  const cut = standings
    .filter((standing) => !standing.advanced)
    .map((standing, index) => ({ place: placed.length + index + 1, standing }));

  return [...placed, ...cut];
}
