import type { FinalPlacing, PoolBoutResult, PoolStanding, ResultFencer } from "../_types/results";

// Placeholder results until the pool and event results endpoints exist (§11.3, §13.1).
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

const POOL_BOUTS: PoolBout[] = [
  [MAYA, 5, LIAM, 2],
  [PRIYA, 3, MAYA, 5],
  [MAYA, 5, DIEGO, 1],
  [PRIYA, 5, LIAM, 4],
  [DIEGO, 2, PRIYA, 5],
  [LIAM, 5, DIEGO, 3],
  [HANA, 5, NOAH, 1],
  [AMARA, 4, HANA, 5],
  [HANA, 5, ETHAN, 3],
  [AMARA, 5, NOAH, 3],
  [ETHAN, 0, AMARA, 5],
  [NOAH, 5, ETHAN, 4],
  [KENJI, 5, SOFIA, 4],
  [LEILA, 2, KENJI, 5],
  [KENJI, 5, MARCUS, 3],
  [SOFIA, 5, LEILA, 1],
  [MARCUS, 3, SOFIA, 5],
  [LEILA, 5, MARCUS, 4],
];

function boutsOf(subject: ResultFencer): PoolBoutResult[] {
  return POOL_BOUTS
    .filter(([left, , right]) => left === subject || right === subject)
    .map(([left, leftScore, right, rightScore]) =>
      left === subject
        ? { opponent: right, touchesScored: leftScore, touchesReceived: rightScore }
        : { opponent: left, touchesScored: rightScore, touchesReceived: leftScore },
    );
}

function standing(
  subject: ResultFencer,
  pool: number,
  poolPlace: number,
  victories: number,
  touchesScored: number,
  touchesReceived: number,
  advanced: boolean,
): PoolStanding {
  const bouts = boutsOf(subject);
  return {
    fencer: subject,
    pool,
    poolPlace,
    victories,
    victoryRatio: victories / bouts.length,
    touchesScored,
    touchesReceived,
    indicator: touchesScored - touchesReceived,
    advanced,
    bouts,
  };
}

// Overall ranking after pools; the top eight make the cut.
const POOL_RESULTS: PoolStanding[] = [
  standing(MAYA, 1, 1, 3, 15, 6, true),
  standing(HANA, 2, 1, 3, 15, 8, true),
  standing(KENJI, 3, 1, 3, 15, 9, true),
  standing(AMARA, 2, 2, 2, 14, 8, true),
  standing(SOFIA, 3, 2, 2, 14, 9, true),
  standing(PRIYA, 1, 2, 2, 13, 11, true),
  standing(LIAM, 1, 3, 1, 11, 13, true),
  standing(NOAH, 2, 3, 1, 9, 14, true),
  standing(LEILA, 3, 3, 1, 8, 14, false),
  standing(MARCUS, 3, 4, 0, 10, 15, false),
  standing(ETHAN, 2, 4, 0, 7, 15, false),
  standing(DIEGO, 1, 4, 0, 6, 15, false),
];

const FINAL_PLACES: [ResultFencer, number][] = [
  [MAYA, 1],
  [HANA, 2],
  [KENJI, 3],
  [SOFIA, 3],
  [AMARA, 5],
  [PRIYA, 6],
  [LIAM, 7],
  [NOAH, 8],
  [LEILA, 9],
  [MARCUS, 10],
  [ETHAN, 11],
  [DIEGO, 12],
];

export function getPoolResults(): PoolStanding[] {
  return POOL_RESULTS;
}

export function getFinalPlacings(): FinalPlacing[] {
  return FINAL_PLACES.map(([subject, place]) => ({
    place,
    standing: POOL_RESULTS.find((result) => result.fencer.id === subject.id)!,
  }));
}
