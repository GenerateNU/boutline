"use client";

import { useState } from "react";

import { Calendar } from "@/components/primitives/calendar";
import { useToday } from "@/features/tournament/hooks/use-today";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { parseDateParam } from "@/features/tournament/lib/date-param";

function CalendarView() {
  const { searchParams, setDate } = useTournamentFilters();
  const selected = parseDateParam(searchParams.get("date"));
  const today = useToday();
  const [pagedMonth, setMonth] = useState<Date>();
  const month = pagedMonth ?? selected ?? today;

  if (!today || !month) {
    return null;
  }

  return (
    <Calendar
      mode="single"
      today={today}
      month={month}
      selected={selected}
      onSelect={(day) => {
        setMonth(undefined);
        setDate(day);
      }}
      onMonthChange={setMonth}
      className="border-b border-outline px-5.5 py-4 shadow-sm"
    />
  );
}

export { CalendarView };
