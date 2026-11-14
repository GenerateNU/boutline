import type { TableauBout } from "../../_types/tableau";
import type { NameTone, PillTone } from "./bracket-fencer-row";

interface RowStyle {
  nameTone: NameTone;
  pillTone: PillTone;
}

// A bout that ends level (decided on priority) has no higher score to name a winner by.
function endedRow(score = 0, otherScore = 0): RowStyle {
  if (score === otherScore) {
    return { nameTone: "strong", pillTone: "neutral" };
  }
  return score > otherScore
    ? { nameTone: "strong", pillTone: "winner" }
    : { nameTone: "muted", pillTone: "neutral" };
}

function rowStyles({ status, topScore, bottomScore }: TableauBout): [RowStyle, RowStyle] {
  if (status === "ended") {
    return [endedRow(topScore, bottomScore), endedRow(bottomScore, topScore)];
  }
  const live = status === "active";
  return [
    { nameTone: "strong", pillTone: live ? "mint" : "neutral" },
    { nameTone: "strong", pillTone: live ? "blue" : "neutral" },
  ];
}

export { rowStyles };
export type { RowStyle };
