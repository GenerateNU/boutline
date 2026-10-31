"use client";

import * as React from "react";

import type { TableauRound } from "../../_types/tableau";
import { BracketRound } from "./bracket-round";

const SLOT_HEIGHT = 140;

interface TableauBracketProps {
  rounds: TableauRound[];
  focusedRoundId: string;
  query: string;
  boutBasePath: string;
}

// The entire tableau bracket: every bracket-round side by side in a horizontal row.
// Each column is a BracketRound.
function TableauBracket({ rounds, focusedRoundId, query, boutBasePath }: TableauBracketProps) {
  const columnRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const hasMounted = React.useRef(false);
  const firstRoundId = rounds[0]?.id;

  React.useEffect(() => {
    // The first round is already in view on mount; any other selected round needs scrolling to.
    if (!hasMounted.current) {
      hasMounted.current = true;
      if (focusedRoundId === firstRoundId) {
        return;
      }
    }
    columnRefs.current[focusedRoundId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }, [focusedRoundId, firstRoundId]);

  const firstRoundCount = rounds[0]?.bouts.length || 1;
  const height = firstRoundCount * SLOT_HEIGHT;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-8" style={{ height }}>
        {rounds.map((round, roundIndex) => (
          <BracketRound
            key={round.id}
            ref={(element) => {
              columnRefs.current[round.id] = element;
            }}
            round={round}
            slotCount={Math.max(1, firstRoundCount / 2 ** roundIndex)}
            isLast={roundIndex === rounds.length - 1}
            query={query}
            boutBasePath={boutBasePath}
          />
        ))}
      </div>
    </div>
  );
}

export { TableauBracket };