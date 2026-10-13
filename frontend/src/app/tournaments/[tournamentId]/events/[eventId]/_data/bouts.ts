type Side = "left" | "right";

type BoutFencer = {
  name: string;
  club: string;
  score: number;
};

type Touch = {
  time: string;
  scorer: Side;
  leftScore: number;
  rightScore: number;
};

type Bout = {
  id: string;
  stage: "pool" | "tableau";
  round: string;
  left: BoutFencer;
  right: BoutFencer;
  audit: Touch[];
};

// Placeholder history: touches alternate until each fencer reaches their final score, 20 seconds apart.
function buildAudit(leftFinal: number, rightFinal: number): Touch[] {
  const audit: Touch[] = [];
  let leftScore = 0;
  let rightScore = 0;
  while (leftScore < leftFinal || rightScore < rightFinal) {
    const scorer: Side =
      leftScore < leftFinal && (rightScore >= rightFinal || audit.length % 2 === 0)
        ? "left"
        : "right";
    if (scorer === "left") leftScore++;
    else rightScore++;
    const seconds = (audit.length + 1) * 20;
    audit.push({
      time: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
      scorer,
      leftScore,
      rightScore,
    });
  }
  return audit;
}

function bout(
  id: string,
  stage: Bout["stage"],
  round: string,
  left: BoutFencer,
  right: BoutFencer,
): Bout {
  return { id, stage, round, left, right, audit: buildAudit(left.score, right.score) };
}

const bouts: Bout[] = [
  bout("p1", "pool", "Pool 1", { name: "Alice Chen", club: "Boston FC", score: 5 }, { name: "Ben Ortiz", club: "Northeastern", score: 3 }),
  bout("p2", "pool", "Pool 1", { name: "Carla Diaz", club: "Providence FA", score: 4 }, { name: "Alice Chen", club: "Boston FC", score: 5 }),
  bout("p3", "pool", "Pool 2", { name: "Dev Patel", club: "Hartford FC", score: 5 }, { name: "Eli Novak", club: "Boston FC", score: 2 }),
  bout("t1", "tableau", "Table of 8", { name: "Alice Chen", club: "Boston FC", score: 15 }, { name: "Eli Novak", club: "Boston FC", score: 9 }),
  bout("t2", "tableau", "Table of 8", { name: "Dev Patel", club: "Hartford FC", score: 12 }, { name: "Ben Ortiz", club: "Northeastern", score: 15 }),
  bout("t3", "tableau", "Semifinal", { name: "Alice Chen", club: "Boston FC", score: 15 }, { name: "Ben Ortiz", club: "Northeastern", score: 13 }),
];

function findBout(id: string) {
  return bouts.find((candidate) => candidate.id === id);
}

export { bouts, findBout, type Bout };
