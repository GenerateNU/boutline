"use client";

import { addDays, format, isSameDay } from "date-fns";
import { cn } from "cn";
import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
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

  const days = start
    ? Array.from({ length: visibleDays }, (_, i) => addDays(start, i))
    : [];

  function page(step: number) {
    if (start) {
      setPagedStart(addDays(start, step));
    }
  }

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
        <ChevronLeftOutlined />
      </Button>
      <div className="flex max-w-83.75 min-w-0 flex-1 items-start">
        {days.map((day) => {
          const isSelected = selected !== undefined && isSameDay(day, selected);
          return (
            <button
              key={day.toISOString()}
              type="button"
              aria-pressed={isSelected}
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
      <Button
        type="button"
        variant="text"
        size="icon"
        aria-label="Later days"
        onClick={() => page(visibleDays)}
        className="size-6 rounded-none text-white hover:bg-transparent [&_svg]:size-6"
      >
        <ChevronRightOutlined />
      </Button>
    </div>
  );
}

export { WeekStrip };
