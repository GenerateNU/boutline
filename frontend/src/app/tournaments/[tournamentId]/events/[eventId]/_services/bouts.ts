import { Bout, SeededFencer, Side, Touch } from "../_types/bouts";

// Placeholder copies of the bouts in backend/seeds/seed.sql, with the seeded ids so
// the referee view loads the same bout from a seeded backend. Each audit replays
// that bout's live seeded scorings in order, 20 seconds apart.
const MAYA = { name: "Maya Chen", club: "Boston Fencing Club" };
const LIAM = { name: "Liam O'Brien", club: "Northeastern Fencing" };
const PRIYA = { name: "Priya Patel", club: "Cambridge FC" };
const DIEGO = { name: "Diego Martinez", club: "" };
const HANA = { name: "Hana Sato", club: "Northeastern Fencing" };
const NOAH = { name: "Noah Williams", club: "Boston Fencing Club" };
const AMARA = { name: "Amara Okafor", club: "Cambridge FC" };
const ETHAN = { name: "Ethan Kowalski", club: "" };
const SOFIA = { name: "Sofia Rossi", club: "Boston Fencing Club" };
const KENJI = { name: "Kenji Tanaka", club: "Northeastern Fencing" };
const LEILA = { name: "Leila Haddad", club: "Cambridge FC" };
const MARCUS = { name: "Marcus Johnson", club: "" };

function buildAudit(scorers: Side[]): Touch[] {
  let leftScore = 0;
  let rightScore = 0;
  return scorers.map((scorer, index) => {
    if (scorer === "left") {
      leftScore++;
    } else {
      rightScore++;
    }

    const seconds = (index + 1) * 20;
    return {
      time: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
      scorer,
      leftScore,
      rightScore,
    };
  });
}

function bout(
  id: string,
  stage: Bout["stage"],
  round: string,
  left: SeededFencer,
  right: SeededFencer,
  scorers: Side[] = [],
): Bout {
  const audit = buildAudit(scorers);
  const final = audit.at(-1);
  return {
    id,
    stage,
    round,
    left: { ...left, score: final?.leftScore ?? 0 },
    right: { ...right, score: final?.rightScore ?? 0 },
    audit,
  };
}

export const bouts: Bout[] = [
  bout(
    "e0000000-0000-4000-8000-000000000001",
    "pool",
    "Pool 1",
    MAYA,
    LIAM,
    ["left", "right", "left", "left", "right", "left", "left"],
  ),
  bout("e0000000-0000-4000-8000-000000000002", "pool", "Pool 1", PRIYA, DIEGO),
  bout("e0000000-0000-4000-8000-000000000003", "pool", "Pool 1", MAYA, PRIYA),
  bout("e0000000-0000-4000-8000-000000000004", "pool", "Pool 1", LIAM, DIEGO),
  // Live: the seed also has one revoked touch for Maya, left out here.
  bout(
    "e0000000-0000-4000-8000-000000000005",
    "pool",
    "Pool 1",
    MAYA,
    DIEGO,
    ["right", "left", "right", "left"],
  ),
  bout("e0000000-0000-4000-8000-000000000006", "pool", "Pool 1", LIAM, PRIYA),
  bout("e0000000-0000-4000-8000-000000000007", "pool", "Pool 2", HANA, NOAH),
  bout("e0000000-0000-4000-8000-000000000008", "pool", "Pool 2", AMARA, ETHAN),
  bout("e0000000-0000-4000-8000-000000000009", "pool", "Pool 2", HANA, AMARA),
  bout("e0000000-0000-4000-8000-000000000010", "pool", "Pool 2", NOAH, ETHAN),
  bout("e0000000-0000-4000-8000-000000000011", "pool", "Pool 2", HANA, ETHAN),
  bout("e0000000-0000-4000-8000-000000000012", "pool", "Pool 2", NOAH, AMARA),
  bout("e0000000-0000-4000-8000-000000000013", "pool", "Winter Classic · Pool 1", SOFIA, KENJI),
  bout("e0000000-0000-4000-8000-000000000014", "pool", "Winter Classic · Pool 1", LEILA, MARCUS),
  bout("e0000000-0000-4000-8000-000000000015", "tableau", "Semifinal", MAYA, KENJI),
  bout("e0000000-0000-4000-8000-000000000016", "tableau", "Semifinal", HANA, SOFIA),
  bout("e0000000-0000-4000-8000-000000000017", "tableau", "Final", MAYA, HANA),
];

export function findBout(id: string) {
  return bouts.find((candidate) => candidate.id === id);
}
