import * as React from "react";

import type { TableauBout, TableauRound } from "../../_types/tableau";
import { BracketGroup, type Slot } from "./bracket-group";

function pairUp(slots: Slot[]): Slot[][] {
  const pairs: Slot[][] = [];
  for (let index = 0; index < slots.length; index += 2) {
    pairs.push(slots.slice(index, index + 2));
  }
  return pairs;
}

interface BracketRoundProps {
  round: TableauRound;
  isLast: boolean;
  query: string;
  boutBasePath: string;
  ref: React.Ref<HTMLDivElement>;
}

// One column of a tableau's bracket, e.g. "Semi-finals": its matches and the
// connector lines to the next round.
function BracketRound({ round, isLast, query, boutBasePath, ref }: BracketRoundProps) {
  // A bout goes in the slot matching its number; a slot is empty for a bye or until its bout exists.
  const boutsByNumber = new Map<number, TableauBout>();
  for (const bout of round.bouts) {
    if (!boutsByNumber.has(bout.number)) {
      boutsByNumber.set(bout.number, bout);
    }
  }
  const slots = Array.from({ length: round.size / 2 }, (_, index) => boutsByNumber.get(index + 1));
  const groups = isLast ? slots.map((slot) => [slot]) : pairUp(slots);

  return (
    <div ref={ref} aria-label={round.name} className="flex w-56 shrink-0 flex-col">
      {groups.map((group, groupIndex) => (
        <BracketGroup key={groupIndex} slots={group} query={query} boutBasePath={boutBasePath} />
      ))}
    </div>
  );
}

export { BracketRound };
