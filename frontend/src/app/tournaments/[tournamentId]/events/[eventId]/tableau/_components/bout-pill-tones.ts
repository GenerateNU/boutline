import type { TableauBout } from "../../_types/tableau";
import type { PillTone } from "./bracket-fencer-row";

// A bout that ends level (decided on priority) has no higher score to name a winner by.
function endedTone(score = 0, otherScore = 0): PillTone {
  return score > otherScore ? "winner" : "neutral";
}

function pillTones({ status, topScore, bottomScore }: TableauBout): [PillTone, PillTone] {
  if (status === "ended") {
    return [endedTone(topScore, bottomScore), endedTone(bottomScore, topScore)];
  }
  return status === "active" ? ["mint", "blue"] : ["neutral", "neutral"];
}

export { pillTones };
