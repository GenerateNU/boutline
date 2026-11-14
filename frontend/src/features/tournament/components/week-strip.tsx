"use client";

import { addDays, format, isSameDay } from "date-fns";
import { cn } from "cn";
import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import { useEffect, useEffectEvent, useState } from "react";

import { Button } from "@/components/primitives/button";
import { useDayDrag } from "@/features/tournament/hooks/use-day-drag";
import { useToday } from "@/features/tournament/hooks/use-today";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { parseDateParam } from "@/features/tournament/lib/date-param";

const VISIBLE_DAYS = 5;

interface DayButtonProps {
  day: Date;
  selected: Date | undefined;
  offScreen: boolean;
  onSelect: (day: Date) => void;
}

function DayButton({ day, selected, offScreen, onSelect }: DayButtonProps) {
  const isSelected = selected !== undefined && isSameDay(day, selected);

  return (
    <Button
      type="button"
      variant="text"
      aria-pressed={isSelected}
      aria-hidden={offScreen || undefined}
      tabIndex={offScreen ? -1 : undefined}
      onClick={() => onSelect(day)}
      className={cn(
        "h-auto min-w-0 flex-1 flex-col rounded-none px-1 pt-2.5 font-medium text-neutral-muted hover:bg-transparent after:h-0.5 after:w-full after:rounded-t-xs",
        isSelected && "font-semibold text-white after:bg-accent-green",
      )}
    >
      {format(day, "MMM d")}
    </Button>
  );
}

function WeekStrip() {
  const { searchParams, setDate } = useTournamentFilters();
  const dateParam = searchParams.get("date");
  const today = useToday();
  const selected = parseDateParam(dateParam) ?? today;
  const [pagedStart, setPagedStart] = useState<Date>();
  const start = pagedStart ?? selected;

  // The server falls back to today in ?tz= (else UTC) when the URL has no valid date. Once
  // the browser knows its own today, write that into the URL so the list matches
  // the local day the strip shows.
  const selectToday = useEffectEvent((day: Date) => setDate(day));
  useEffect(() => {
    if (today && !parseDateParam(dateParam)) {
      selectToday(today);
    }
  }, [dateParam, today]);

  // One page of days either side of the visible one, revealed while dragging.
  const days = start
    ? Array.from({ length: VISIBLE_DAYS * 3 }, (_, i) => addDays(start, i - VISIBLE_DAYS))
    : [];

  // Turning the page also selects its first day, so the selection stays leftmost.
  function page(step: number) {
    if (start) {
      const pageStart = addDays(start, step);
      setPagedStart(pageStart);
      setDate(pageStart);
    }
  }

  const { rowRef, rowStyle, trackHandlers } = useDayDrag(VISIBLE_DAYS, page);

  // Tapping the selected day again keeps it selected rather than clearing it.
  function select(day: Date) {
    if (selected && isSameDay(day, selected)) {
      return;
    }
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
        onClick={() => page(-VISIBLE_DAYS)}
        className="size-6 rounded-none text-white hover:bg-transparent [&_svg]:size-6"
      >
        <ChevronLeftOutlined />
      </Button>
      <div
        {...trackHandlers}
        className="max-w-83.75 min-w-0 flex-1 cursor-grab touch-pan-y overflow-hidden select-none active:cursor-grabbing"
      >
        <div ref={rowRef} style={rowStyle} className="flex items-start">
          {days.map((day, i) => (
            <DayButton
              key={day.toISOString()}
              day={day}
              selected={selected}
              offScreen={i < VISIBLE_DAYS || i >= VISIBLE_DAYS * 2}
              onSelect={select}
            />
          ))}
        </div>
      </div>
      <Button
        type="button"
        variant="text"
        size="icon"
        aria-label="Later days"
        onClick={() => page(VISIBLE_DAYS)}
        className="size-6 rounded-none text-white hover:bg-transparent [&_svg]:size-6"
      >
        <ChevronRightOutlined />
      </Button>
    </div>
  );
}

export { WeekStrip };
