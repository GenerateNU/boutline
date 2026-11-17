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

const CHEVRON_COLOR = { dark: "text-white", light: "text-obsidian" };

type StripSurface = "dark" | "light";

interface DayButtonProps {
  day: Date;
  selected: Date | undefined;
  offScreen: boolean;
  surface: StripSurface;
  onSelect: (day: Date) => void;
}

function DayButton({ day, selected, offScreen, surface, onSelect }: DayButtonProps) {
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
        {
          "font-semibold after:bg-accent-green": isSelected,
          "text-white": isSelected && surface === "dark",
          "text-obsidian": isSelected && surface === "light",
        },
      )}
    >
      {format(day, "MMM d")}
    </Button>
  );
}

interface WeekStripProps {
  // The day shown while the URL has no date, when the page picks one itself.
  defaultDay?: string;
  // Dark sits under the navbar on /tournaments; light sits in page content.
  surface?: StripSurface;
  // No day is selected until one is tapped, and tapping the selected day clears it,
  // so the page shows every date.
  deselectable?: boolean;
}

function WeekStrip({ defaultDay, surface = "dark", deselectable = false }: WeekStripProps) {
  const { searchParams, setDate, clearDate } = useTournamentFilters();
  const dateParam = searchParams.get("date");
  const today = useToday();
  const anchor = parseDateParam(dateParam) ?? parseDateParam(defaultDay) ?? today;
  const selected = deselectable ? parseDateParam(dateParam) : anchor;
  const [pagedStart, setPagedStart] = useState<Date>();
  const start = pagedStart ?? anchor;

  // A strip that always has a day shows today when the URL has none. Once the
  // browser knows its own today, write that into the URL so the page lists the
  // day the strip shows.
  const selectToday = useEffectEvent((day: Date) => setDate(day));
  useEffect(() => {
    if (today && !deselectable && !defaultDay && !parseDateParam(dateParam)) {
      selectToday(today);
    }
  }, [dateParam, defaultDay, deselectable, today]);

  // One page of days either side of the visible one, revealed while dragging.
  const days = start
    ? Array.from({ length: VISIBLE_DAYS * 3 }, (_, i) => addDays(start, i - VISIBLE_DAYS))
    : [];

  // Turning the page also selects its first day, so the selection stays leftmost.
  // With no day selected it only moves the strip, keeping every date listed.
  function page(step: number) {
    if (start) {
      const pageStart = addDays(start, step);
      setPagedStart(pageStart);
      if (selected) {
        setDate(pageStart);
      }
    }
  }

  const { rowRef, rowStyle, trackHandlers } = useDayDrag(VISIBLE_DAYS, page);

  // Tapping the selected day again clears it when the strip is deselectable, else keeps it.
  function select(day: Date) {
    const tappedSelected = selected !== undefined && isSameDay(day, selected);
    if (tappedSelected && !deselectable) {
      return;
    }
    setPagedStart(start);
    if (tappedSelected) {
      clearDate();
    } else {
      setDate(day);
    }
  }

  return (
    <div
      className={cn("flex h-12 items-center justify-center px-1 pt-0.75 font-manrope", {
        "bg-obsidian shadow-md": surface === "dark",
      })}
    >
      <Button
        type="button"
        variant="text"
        size="icon"
        aria-label="Earlier days"
        onClick={() => page(-VISIBLE_DAYS)}
        className={cn("size-6 rounded-none hover:bg-transparent [&_svg]:size-6", CHEVRON_COLOR[surface])}
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
              surface={surface}
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
        className={cn("size-6 rounded-none hover:bg-transparent [&_svg]:size-6", CHEVRON_COLOR[surface])}
      >
        <ChevronRightOutlined />
      </Button>
    </div>
  );
}

export { WeekStrip };
