"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";
import { useEffect, useRef } from "react";
import {
  DayPicker,
  useDayPicker,
  type DayButton,
  type MonthCaptionProps,
} from "react-day-picker";

import { Button } from "@/components/primitives/button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      hideNavigation
      className={cn(
        "rounded-lg border border-outline bg-background p-3 [--cell-size:--spacing(9)]",
        className,
      )}
      formatters={{
        formatWeekdayName: (date) =>
          date.toLocaleString(undefined, { weekday: "narrow" }),
      }}
      classNames={{
        month: "flex w-full flex-col gap-4",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "flex-1 text-xs font-normal text-neutral-muted select-none",
        week: "mt-1 flex w-full",
        day: "relative aspect-square h-full w-full p-0.5 text-center text-sm text-obsidian select-none",
        outside: "[&_button]:text-neutral-muted",
        disabled: "[&_button]:text-neutral-muted [&_button]:opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        DayButton: CalendarDayButton,
        MonthCaption: CalendarCaption,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  day,
  modifiers,
  className,
  children,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (modifiers.focused) {
      ref.current?.focus();
    }
  }, [modifiers.focused]);

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString()}
      className={cn(
        "relative flex aspect-square w-full min-w-(--cell-size) cursor-pointer items-center justify-center rounded-full text-sm outline-none hover:bg-blue-lighter focus-visible:ring-3 focus-visible:ring-blue-lighter",
        modifiers.today && "ring-1 ring-blue",
        modifiers.selected && "bg-blue text-white ring-0 hover:bg-blue",
        className,
      )}
      {...props}
    >
      {children}
      {modifiers.hasEvent && (
        <span
          aria-hidden
          className="absolute bottom-1 size-1 rounded-full bg-accent-green"
        />
      )}
    </button>
  );
}

function CalendarCaption({ calendarMonth }: MonthCaptionProps) {
  const { goToMonth } = useDayPicker();
  const shown = calendarMonth.date;
  const shift = (months: number) =>
    goToMonth(new Date(shown.getFullYear(), shown.getMonth() + months, 1));

  return (
    <div className="flex items-center justify-around">
      <div className="flex items-center gap-2">
        <Button variant="text" size="icon" aria-label="Previous month" onClick={() => shift(-1)}>
          <ChevronLeft className="text-neutral-secondary" />
        </Button>
        <p className="w-24 text-center text-sm font-medium text-obsidian">
          {shown.toLocaleString(undefined, { month: "long" })}
        </p>
        <Button variant="text" size="icon" aria-label="Next month" onClick={() => shift(1)}>
          <ChevronRight className="text-neutral-secondary" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="text" size="icon" aria-label="Previous year" onClick={() => shift(-12)}>
          <ChevronLeft className="text-neutral-secondary" />
        </Button>
        <p className="w-12 text-center text-sm font-medium text-obsidian">{shown.getFullYear()}</p>
        <Button variant="text" size="icon" aria-label="Next year" onClick={() => shift(12)}>
          <ChevronRight className="text-neutral-secondary" />
        </Button>
      </div>
    </div>
  );
}

export { Calendar };
