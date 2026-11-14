"use client";

import { useEffect, useRef } from "react";

import type { TableauRound } from "../../_types/tableau";
import { BracketRound } from "./bracket-round";
import { latestMatchingRoundId } from "./latest-matching-round";

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
  // True when the selected round changed because the user swiped there, so the
  // effect below shouldn't scroll again (it would jump back to the top).
  const focusFromSwipe = useRef(false);
  const firstRoundId = rounds[0]?.id;

  // Scrolls so the column sits at the left edge and the bout sits just below the
  // round buttons floating above the scroller (hence the pt-16 clearance).
  function scrollToBout(column: HTMLElement, bout: HTMLElement) {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    const clearance = 64;
    const scrollerRect = scroller.getBoundingClientRect();
    const left =
      scroller.scrollLeft +
      column.getBoundingClientRect().left -
      scrollerRect.left;
    const top =
      scroller.scrollTop +
      bout.getBoundingClientRect().top -
      scrollerRect.top -
      clearance;
    // The last rounds can't reach the left edge (nothing left to scroll), so clamp.
    const maxLeft = scroller.scrollWidth - scroller.clientWidth;
    const maxTop = scroller.scrollHeight - scroller.clientHeight;
    const targetLeft = Math.min(Math.max(left, 0), maxLeft);
    const targetTop = Math.min(Math.max(top, 0), maxTop);
    // No movement means no scroll event, which would leave the pick flag stuck.
    if (
      Math.abs(targetLeft - scroller.scrollLeft) < 1 &&
      Math.abs(targetTop - scroller.scrollTop) < 1
    ) {
      return;
    }
    scrollingToButtonPick.current = true;
    scroller.scrollTo({ left: targetLeft, top: targetTop, behavior: "smooth" });
  }

  // Round picked in the button group (or by a swipe): scroll to its column by the left edge.
  useEffect(() => {
    // The first round is already in view on mount; any other selected round needs scrolling to.
    if (!hasMounted.current) {
      hasMounted.current = true;
      if (focusedRoundId === firstRoundId) {
        return;
      }
    }
    if (focusFromSwipe.current) {
      focusFromSwipe.current = false;
      return;
    }
    const column = columnRefs.current[focusedRoundId];
    // The round's first (top) bout: a link, or a TBA placeholder.
    const firstBout = column?.querySelector<HTMLElement>("a, [role='group']");
    if (column && firstBout) {
      scrollToBout(column, firstBout);
    }
  }, [focusedRoundId, firstRoundId]);

  // On a new search, scroll to the first match in the latest round it appears in.
  // Declared after the effect above so its scroll wins when both fire.
  useEffect(() => {
    const roundId = latestMatchingRoundId(rounds, query);
    const column = roundId ? columnRefs.current[roundId] : null;
    const match = column?.querySelector<HTMLElement>("[data-matched]");
    if (column && match) {
      scrollToBout(column, match);
    }
    // Only re-run when the search text changes, not on every swipe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

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
        focusFromSwipe.current = true;
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
