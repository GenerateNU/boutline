"use client";

import { addMonths, addYears, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
import { Calendar } from "@/components/primitives/calendar";
import { useToday } from "@/features/tournament/hooks/use-today";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { parseDateParam } from "@/features/tournament/lib/date-param";

function NoCaption() {
  return <></>;
}

function CalendarView() {
  const { searchParams, setFilters, setDate } = useTournamentFilters();
  const selected = parseDateParam(searchParams.get("date"));
  const today = useToday();
  const [pagedMonth, setMonth] = useState<Date>();
  const month = pagedMonth ?? selected ?? today;

  return (
    <div className="flex flex-col gap-2.5">
      <Button
        type="button"
        variant="text"
        onClick={() => setFilters({ view: undefined })}
        className="h-auto gap-0 self-start px-0 text-base leading-5 font-normal hover:bg-transparent"
      >
        <ChevronLeft className="size-6!" />
        Weekly View
      </Button>
      <h2 className="pt-2.5 text-xl leading-6 font-medium">Calendar View</h2>

      {today && month && (
        <>
          <div className="flex items-center justify-center gap-2.5 px-2.5 py-1.5">
            <Stepper
              label={format(month, "MMMM")}
              unit="month"
              onStep={(step) => setMonth(addMonths(month, step))}
            />
            <Stepper
              label={format(month, "yyyy")}
              unit="year"
              onStep={(step) => setMonth(addYears(month, step))}
            />
          </div>

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
            components={{ MonthCaption: NoCaption }}
            className="mx-auto w-fit border border-brand p-4"
            classNames={{
              weekday: "flex-1 text-xs font-light text-brand select-none",
              day: "relative aspect-square p-0.5 text-center select-none [&_button]:text-sm [&_button]:text-brand [&_button[data-selected=true]]:border-brand",
              outside: "[&_button]:text-chip",
            }}
          />
        </>
      )}
    </div>
  );
}

type StepperProps = {
  label: string;
  unit: string;
  onStep: (step: number) => void;
};

function Stepper({ label, unit, onStep }: StepperProps) {
  return (
    <div className="flex w-38.5 items-center justify-center gap-2.5 px-5.5">
      <Button
        type="button"
        variant="text"
        size="icon"
        aria-label={`Previous ${unit}`}
        onClick={() => onStep(-1)}
        className="-m-2.5"
      >
        <ChevronLeft className="size-5!" />
      </Button>
      <p className="w-20 text-center leading-5 font-medium">{label}</p>
      <Button
        type="button"
        variant="text"
        size="icon"
        aria-label={`Next ${unit}`}
        onClick={() => onStep(1)}
        className="-m-2.5"
      >
        <ChevronRight className="size-5!" />
      </Button>
    </div>
  );
}

export { CalendarView };
