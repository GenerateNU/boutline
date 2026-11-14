"use client";

import { useEffect, useRef } from "react";

import type { TableauRound } from "../../_types/tableau";
import { BracketRound } from "./bracket-round";

// How long scrolling pauses before settling and snapping to the nearest round.
const SCROLL_SETTLE_MS = 100;

interface TableauBracketProps {
  rounds: TableauRound[];
  focusedRoundId: string;
  onFocusedRoundChange: (roundId: string) => void;
  query: string;
  boutBasePath: string;
}

// The entire tableau bracket: every bracket-round side by side in a horizontal row.
// Each column is a BracketRound.
function TableauBracket({
  rounds,
  focusedRoundId,
  onFocusedRoundChange,
  query,
  boutBasePath,
}: TableauBracketProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasMounted = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scrollingToButtonPick = useRef(false);
  const firstRoundId = rounds[0]?.id;

  useEffect(() => {
    // The first round is already in view on mount; any other selected round needs scrolling to.
    if (!hasMounted.current) {
      hasMounted.current = true;
      if (focusedRoundId === firstRoundId) {
        return;
      }
    }
    const scroller = scrollerRef.current;
    const column = columnRefs.current[focusedRoundId];
    if (!scroller || !column) {
      return;
    }
    const offset = column.getBoundingClientRect().left - scroller.getBoundingClientRect().left;
    const roomRight = scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft;
    const canMove = offset > 1 ? roomRight > 1 : offset < -1 && scroller.scrollLeft > 1;
    if (!canMove) {
      return;
    }
    scrollingToButtonPick.current = true;
    scroller.scrollTo({ left: scroller.scrollLeft + offset, behavior: "smooth" });
  }, [focusedRoundId, firstRoundId]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  function handleScroll() {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (scrollingToButtonPick.current) {
        scrollingToButtonPick.current = false;
        return;
      }
      const roundId = snappedRoundId();
      if (roundId && roundId !== focusedRoundId) {
        onFocusedRoundChange(roundId);
      }
    }, SCROLL_SETTLE_MS);
  }

  function snappedRoundId(): string | undefined {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return undefined;
    }
    if (scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1) {
      return rounds[rounds.length - 1]?.id;
    }
    const scrollerLeft = scroller.getBoundingClientRect().left;
    let nearest: { id: string; distance: number } | undefined;
    for (const round of rounds) {
      const column = columnRefs.current[round.id];
      if (!column) {
        continue;
      }
      const distance = Math.abs(column.getBoundingClientRect().left - scrollerLeft);
      if (!nearest || distance < nearest.distance) {
        nearest = { id: round.id, distance };
      }
    }
    return nearest?.id;
  }

  return (
    <div
      ref={scrollerRef}
      onScroll={handleScroll}
      className="snap-x snap-mandatory overflow-x-auto pb-2"
    >
      <div className="flex gap-11.5">
        {rounds.map((round, roundIndex) => (
          <BracketRound
            key={round.id}
            ref={(element) => {
              columnRefs.current[round.id] = element;
            }}
            round={round}
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