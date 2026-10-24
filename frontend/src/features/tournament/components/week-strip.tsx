"use client";

import { addDays, format, isSameDay } from "date-fns";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import { cn } from "cn";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
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
      <Button
        type="button"
        variant="text"
        size="icon"
        aria-label="Earlier days"
        onClick={() => page(-visibleDays)}
      >
        <ArrowLeft className="size-5!" />
      </Button>
      <div className="flex flex-1 justify-between">
        {days.map((day) => {
          const isSelected = selected !== undefined && isSameDay(day, selected);
          return (
            <Button
              key={day.toISOString()}
              type="button"
              variant="text"
              aria-pressed={isSelected}
              onClick={() => select(isSelected ? undefined : day)}
              className={cn(
                "h-auto rounded-none border-b-2 border-transparent px-0 pb-1.5 text-base leading-5 text-muted-foreground hover:bg-transparent",
                isSelected && "border-foreground font-semibold text-foreground",
              )}
            >
              {format(day, "MMM d")}
            </Button>
          );
        })}
      </div>
      <Button
        type="button"
        variant="text"
        size="icon"
        aria-label="Later days"
        onClick={() => page(visibleDays)}
      >
        <ArrowRight className="size-5!" />
      </Button>
      <Button
        type="button"
        variant="text"
        size="icon"
        aria-label="Calendar view"
        onClick={() => setFilters({ view: "calendar" })}
      >
        <CalendarDays className="size-8!" />
      </Button>
    </div>
  );
}

export { WeekStrip };
