"use client";

import { addMonths, addYears, format } from "date-fns";
import Image from "next/image";
import { useState } from "react";

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
      <button
        type="button"
        onClick={() => setFilters({ view: undefined })}
        className="flex cursor-pointer items-center self-start leading-5"
      >
        <Image src="/chevron-left.svg" alt="" width={24} height={24} />
        Weekly View
      </button>
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
      <button
        type="button"
        aria-label={`Previous ${unit}`}
        onClick={() => onStep(-1)}
        className="shrink-0 cursor-pointer"
      >
        <Image src="/chevron-back.svg" alt="" width={20} height={20} />
      </button>
      <p className="w-20 text-center leading-5 font-medium">{label}</p>
      <button
        type="button"
        aria-label={`Next ${unit}`}
        onClick={() => onStep(1)}
        className="shrink-0 cursor-pointer"
      >
        <Image
          src="/chevron-back.svg"
          alt=""
          width={20}
          height={20}
          className="rotate-180"
        />
      </button>
    </div>
  );
}

export { CalendarView };
