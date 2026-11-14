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
  // The scroll container, used to read and set the horizontal scroll position.
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Each round's column element by round id, to measure where it sits.
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasMounted = useRef(false);
  // Debounce timer: fires once scrolling has stopped.
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // True while a scroll was started by picking a round button, so the settle
  // handler doesn't treat it as the user swiping and overwrite the pick.
  const scrollingToButtonPick = useRef(false);
  const firstRoundId = rounds[0]?.id;

  // Round picked in the button group (or by a swipe): scroll to its column by the left edge.
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
    // Distance from scroller's left edge to the column; positive means the column is to the right.
    const offset =
      column.getBoundingClientRect().left -
      scroller.getBoundingClientRect().left;
    // The last rounds can't reach the left edge (nothing left to scroll), so skip the scroll.
    const roomRight =
      scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft;
    const canMove =
      offset > 1 ? roomRight > 1 : offset < -1 && scroller.scrollLeft > 1;
    if (!canMove) {
      return;
    }
    scrollingToButtonPick.current = true;
    scroller.scrollTo({
      left: scroller.scrollLeft + offset,
      behavior: "smooth",
    });
  }, [focusedRoundId, firstRoundId]);

  // Clear any pending settle timer on unmount.
  useEffect(() => () => clearTimeout(settleTimer.current), []);

  // Swiping the bracket updates the selected round button. Wait until scrolling
  // settles so we don't set state on every scroll event.
  function handleScroll() {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      // The scroll came from a button pick; the selection is already right.
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

  // Which round the user has scrolled to: the column closest to the left edge.
  function snappedRoundId(): string | undefined {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return undefined;
    }
    // At the far right the final round(s) can't reach the left edge, so pick the
    // last round explicitly instead of the nearest column.
    if (
      scroller.scrollLeft + scroller.clientWidth >=
      scroller.scrollWidth - 1
    ) {
      return rounds[rounds.length - 1]?.id;
    }
    const scrollerLeft = scroller.getBoundingClientRect().left;
    let nearest: { id: string; distance: number } | undefined;
    for (const round of rounds) {
      const column = columnRefs.current[round.id];
      if (!column) {
        continue;
      }
      const distance = Math.abs(
        column.getBoundingClientRect().left - scrollerLeft,
      );
      if (!nearest || distance < nearest.distance) {
        nearest = { id: round.id, distance };
      }
    }
    return nearest?.id;
  }

  return (
    <div className="h-full">
      {/* Scrolls both ways. Top padding keeps the first cards clear of the round
          buttons, which float over it; snap-x lines columns up on swipe. */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="h-full snap-x snap-mandatory overflow-auto pt-16 pb-6"
      >
        <div className="flex w-max gap-11.5">
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
    </div>
  );
}

export { TableauBracket };
