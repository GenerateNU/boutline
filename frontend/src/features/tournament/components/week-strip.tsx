"use client";

import { addDays, format, isSameDay } from "date-fns";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import { cn } from "cn";
import { useState } from "react";

import { useToday } from "@/features/tournament/hooks/use-today";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { parseDateParam } from "@/features/tournament/lib/date-param";

const visibleDays = 4;

function WeekStrip() {
  const { searchParams, setFilters, setDate } = useTournamentFilters();
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
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        aria-label="Earlier days"
        onClick={() => page(-visibleDays)}
        className="shrink-0 cursor-pointer"
      >
        <ArrowLeft className="size-5" />
      </button>
      <div className="flex flex-1 justify-between">
        {days.map((day) => {
          const isSelected = selected !== undefined && isSameDay(day, selected);
          return (
            <button
              key={day.toISOString()}
              type="button"
              aria-pressed={isSelected}
              onClick={() => select(isSelected ? undefined : day)}
              className={cn(
                "cursor-pointer border-b-2 border-transparent pb-1.5 leading-5 font-medium text-muted-foreground",
                isSelected && "border-foreground font-semibold text-foreground",
              )}
            >
              {format(day, "MMM d")}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Later days"
        onClick={() => page(visibleDays)}
        className="shrink-0 cursor-pointer"
      >
        <ArrowRight className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Calendar view"
        onClick={() => setFilters({ view: "calendar" })}
        className="shrink-0 cursor-pointer"
      >
        <CalendarDays className="size-8" />
      </button>
    </div>
  );
}

export { WeekStrip };
