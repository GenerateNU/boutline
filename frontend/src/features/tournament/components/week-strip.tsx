"use client";

import { addDays, format, isSameDay } from "date-fns";
import { cn } from "cn";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
import { useDayDrag } from "@/features/tournament/hooks/use-day-drag";
import { useToday } from "@/features/tournament/hooks/use-today";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { parseDateParam } from "@/features/tournament/lib/date-param";

const visibleDays = 5;

function WeekStrip() {
  const { searchParams, setDate } = useTournamentFilters();
  const selected = parseDateParam(searchParams.get("date"));
  const today = useToday();
  const [pagedStart, setPagedStart] = useState<Date>();
  const anchor = selected ?? today;
  const start = pagedStart ?? (anchor && addDays(anchor, -1));

  // One page of days either side of the visible one, revealed while dragging.
  const days = start
    ? Array.from({ length: visibleDays * 3 }, (_, i) => addDays(start, i - visibleDays))
    : [];

  function page(step: number) {
    if (start) {
      setPagedStart(addDays(start, step));
    }
  }

  const { rowRef, rowStyle, trackHandlers } = useDayDrag(visibleDays, page);

  function select(day: Date | undefined) {
    setPagedStart(start);
    setDate(day);
  }

  return (
    <div className="flex h-12 items-center justify-center bg-obsidian px-1 pt-0.75 font-manrope shadow-md">
      <Button
        type="button"
        variant="text"
        size="icon"
        aria-label="Earlier days"
        onClick={() => page(-visibleDays)}
        className="size-6 rounded-none text-white hover:bg-transparent [&_svg]:size-6"
      >
        <ChevronLeft />
      </Button>
      <div
        {...trackHandlers}
        className="max-w-83.75 min-w-0 flex-1 cursor-grab touch-pan-y overflow-hidden select-none active:cursor-grabbing"
      >
        <div ref={rowRef} style={rowStyle} className="flex items-start">
          {days.map((day, i) => {
            const isSelected = selected !== undefined && isSameDay(day, selected);
            const offScreen = i < visibleDays || i >= visibleDays * 2;
            return (
              <button
                key={day.toISOString()}
                type="button"
                aria-pressed={isSelected}
                aria-hidden={offScreen || undefined}
                tabIndex={offScreen ? -1 : undefined}
                onClick={() => select(isSelected ? undefined : day)}
                className={cn(
                  "flex min-w-0 flex-1 cursor-pointer flex-col whitespace-nowrap items-center gap-2 px-1 pt-2.5 text-sm font-medium text-neutral-muted after:h-0.5 after:w-full after:rounded-t-xs",
                  isSelected && "font-semibold text-white after:bg-accent-green",
                )}
              >
                {format(day, "MMM d")}
              </button>
            );
          })}
        </div>
      </div>
      <Button
        type="button"
        variant="text"
        size="icon"
        aria-label="Later days"
        onClick={() => page(visibleDays)}
        className="size-6 rounded-none text-white hover:bg-transparent [&_svg]:size-6"
      >
        <ChevronRight />
      </Button>
    </div>
  );
}

export { WeekStrip };
