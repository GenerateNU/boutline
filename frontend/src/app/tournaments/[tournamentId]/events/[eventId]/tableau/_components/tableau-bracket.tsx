"use client";

import * as React from "react";

import type { TableauRound } from "../../_types/tableau";
import { BracketMatch } from "./bracket-match";
import { matchesQuery } from "./tableau-utils";

const SLOT_HEIGHT = 140;

interface TableauBracketProps {
  rounds: TableauRound[];
  focusedRoundId: string;
  query: string;
  boutBasePath: string;
}

function TableauBracket({ rounds, focusedRoundId, query, boutBasePath }: TableauBracketProps) {
  const columnRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const hasMounted = React.useRef(false);

  // Scroll the chosen round's column into view, but not on first load.
  React.useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    columnRefs.current[focusedRoundId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }, [focusedRoundId]);

  const firstRoundCount = rounds[0]?.bouts.length || 1;
  const height = firstRoundCount * SLOT_HEIGHT;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-8" style={{ height }}>
        {rounds.map((round, roundIndex) => {
          const isLast = roundIndex === rounds.length - 1;
          // A bout goes in the slot matching its number; a slot is empty until its bout exists.
          const slotCount = Math.max(1, firstRoundCount / 2 ** roundIndex);
          const slots = Array.from({ length: slotCount }, (_, index) =>
            round.bouts.find((bout) => bout.number === index + 1),
          );
          const groups = isLast ? slots.map((slot) => [slot]) : pairUp(slots);

          return (
            <div
              key={round.id}
              ref={(element) => {
                columnRefs.current[round.id] = element;
              }}
              aria-label={round.name}
              className="flex w-56 shrink-0 flex-col"
            >
              {groups.map((group, groupIndex) => (
                <div key={groupIndex} className="relative flex flex-1 flex-col">
                  {group.map((bout, slotIndex) => (
                    <div key={slotIndex} className="flex flex-1 items-center">
                      {bout && (
                        <BracketMatch
                          bout={bout}
                          href={`${boutBasePath}/${bout.id}`}
                          dimmed={!matchesQuery(bout, query)}
                        />
                      )}
                    </div>
                  ))}
                  {group.length === 2 && group.some(Boolean) && (
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
        })}
      </div>
    </div>
  );
}

function pairUp<T>(items: T[]): T[][] {
  const pairs: T[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    pairs.push(items.slice(index, index + 2));
  }
  return pairs;
}

export { TableauBracket };