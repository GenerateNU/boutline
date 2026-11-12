"use client";

import { useRef, useState } from "react";

// Movement under this many pixels is a tap on a day, not a drag.
const DRAG_THRESHOLD = 5;
// A drag past this share of the strip turns the page; a shorter one springs back.
const PAGE_THRESHOLD = 1 / 4;
const SETTLE_MS = 200;

interface Drag {
  pointerId: number;
  startX: number;
  pageWidth: number;
  dragging: boolean;
}

// The row holds three pages of days, one off-screen on each side of the visible
// page, so it's shifted left by a third to show the middle one.
function rowTransform(offset: number) {
  return `translateX(calc(-100% / 3 + ${offset}px))`;
}

function clamp(value: number, limit: number) {
  return Math.max(-limit, Math.min(limit, value));
}

function useDayDrag(visibleDays: number, onShift: (days: number) => void) {
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState(0);

  // Glides the row from where the finger left it to its resting place. Runs
  // before React commits the shifted days, so it starts from the same spot.
  function settle(from: number) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (from === 0 || reduceMotion) {
      return;
    }
    rowRef.current?.animate([{ transform: rowTransform(from) }, { transform: rowTransform(0) }], {
      duration: SETTLE_MS,
      easing: "ease-out",
    });
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    // A drag that ended outside the strip never produced a click to swallow.
    suppressClick.current = false;
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      pageWidth: event.currentTarget.clientWidth,
      dragging: false,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - current.startX;
    if (!current.dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) {
        return;
      }
      // Captured only once it's a drag, so a tap's click still lands on the day under it.
      current.dragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setOffset(clamp(dx, current.pageWidth));
  }

  function finish(event: React.PointerEvent<HTMLDivElement>, canShift: boolean) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) {
      return;
    }
    drag.current = null;
    if (!current.dragging) {
      return;
    }
    suppressClick.current = true;
    const turnsPage = canShift && Math.abs(offset) > current.pageWidth * PAGE_THRESHOLD;
    const pages = turnsPage ? -Math.sign(offset) : 0;
    if (pages !== 0) {
      onShift(pages * visibleDays);
    }
    setOffset(0);
    settle(offset + pages * current.pageWidth);
  }

  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (suppressClick.current) {
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }

  return {
    rowRef,
    rowStyle: { width: "300%", transform: rowTransform(offset) },
    trackHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => finish(event, true),
      onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => finish(event, false),
      onClickCapture,
    },
  };
}

export { useDayDrag };
