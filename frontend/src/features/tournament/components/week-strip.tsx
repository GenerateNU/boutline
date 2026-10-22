"use client";

import { addDays, format, isSameDay } from "date-fns";
import Image from "next/image";
import { cn } from "cn";
import { useState } from "react";

import { useToday } from "@/features/tournament/hooks/use-today";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { formatDateParam, parseDateParam } from "@/features/tournament/lib/date-param";

const visibleDays = 4;

function WeekStrip() {
  const { searchParams, setFilters } = useTournamentFilters();
  const selected = parseDateParam(searchParams.get("date"));
  const today = useToday();
  // Unset until the user pages the strip, so it follows the selected day (or
  // today, once known in the browser) instead of a value frozen at mount.
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
    // Pin the window so picking a day doesn't slide the strip under the tap.
    setPagedStart(start);
    setFilters({ date: day ? formatDateParam(day) : undefined });
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        aria-label="Earlier days"
        onClick={() => page(-visibleDays)}
        className="shrink-0 cursor-pointer"
      >
        <Image
          src="/arrow.svg"
          alt=""
          width={19}
          height={15}
          className="rotate-180"
        />
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
                "flex cursor-pointer flex-col gap-1.5 leading-5 font-medium text-muted-foreground",
                isSelected && "font-semibold text-foreground",
              )}
            >
              {format(day, "MMM d")}
              {isSelected && (
                <Image
                  src="/tab-underline.svg"
                  alt=""
                  width={41}
                  height={2}
                  className="h-0.5 w-full"
                />
              )}
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
        <Image src="/arrow.svg" alt="" width={19} height={15} />
      </button>
      <button
        type="button"
        aria-label="Calendar view"
        onClick={() => setFilters({ view: "calendar" })}
        className="shrink-0 cursor-pointer"
      >
        <Image
          src="/calendar.svg"
          alt=""
          width={40}
          height={38}
        />
      </button>
    </div>
  );
}

export { WeekStrip };
