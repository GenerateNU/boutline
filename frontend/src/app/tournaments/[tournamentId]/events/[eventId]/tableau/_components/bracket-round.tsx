import * as React from "react";

import type { TableauBout, TableauRound } from "../../_types/tableau";
import { BracketMatch } from "./bracket-match";
import { matchesQuery } from "./tableau-utils";
import { TbaBout } from "./tba-bout";

// A bout, or undefined while the bout in that slot doesn't exist yet.
type Slot = TableauBout | undefined;

function pairUp(slots: Slot[]): Slot[][] {
  const pairs: Slot[][] = [];
  for (let index = 0; index < slots.length; index += 2) {
    pairs.push(slots.slice(index, index + 2));
  }
  return pairs;
}

interface BracketRoundProps {
  round: TableauRound;
  slotCount: number;
  isLast: boolean;
  query: string;
  boutBasePath: string;
  ref: React.Ref<HTMLDivElement>;
}

// One column of a tableau's bracket, e.g. "Semi-finals": its matches and the
// connector lines to the next round.
function BracketRound({ round, slotCount, isLast, query, boutBasePath, ref }: BracketRoundProps) {
  // A bout goes in the slot matching its number; a slot is empty until its bout exists.
  const slots = Array.from({ length: slotCount }, (_, index) =>
    round.bouts.find((bout) => bout.number === index + 1),
  );
  const groups = isLast ? slots.map((slot) => [slot]) : pairUp(slots);

  return (
    <div ref={ref} aria-label={round.name} className="flex w-56 shrink-0 flex-col">
      {groups.map((group, groupIndex) => (
        <div key={groupIndex} className="relative flex flex-1 flex-col">
          {group.map((bout, slotIndex) => (
            <div key={slotIndex} className="flex flex-1 items-center">
              {bout ? (
                <BracketMatch
                  bout={bout}
                  href={`${boutBasePath}/${bout.id}`}
                  dimmed={!matchesQuery(bout, query)}
                />
              ) : (
                <TbaBout dimmed={query.trim() !== ""} />
              )}
            </div>
          ))}
          {group.length === 2 && (
            <>
              {/* ⊐ shape joining the centers of the two bouts */}
              <span
                aria-hidden
                className="absolute top-1/4 -right-4 h-1/2 w-4 border-y border-r border-foreground"
              />
              {/* line from the middle of ⊐ to the next round */}
              <span
                aria-hidden
                className="absolute top-1/2 -right-8 w-4 border-t border-foreground"
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export { BracketRound };
