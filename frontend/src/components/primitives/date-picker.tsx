"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";
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
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      hideNavigation
      className={cn("w-full bg-background [--cell-size:--spacing(11)]", className)}
      formatters={{
        formatWeekdayName: (date) =>
          date.toLocaleString(undefined, { weekday: "narrow" }),
      }}
      classNames={{
        month: "flex w-full flex-col gap-4",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "flex-1 text-sm font-normal text-foreground select-none",
        week: "mt-2 flex w-full",
        day: "relative aspect-square h-full w-full p-1 text-center select-none",
        outside: "[&_button]:text-muted-foreground",
        disabled: "[&_button]:text-muted-foreground [&_button]:opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        DayButton: CalendarDayButton,
        MonthCaption: CalendarCaption,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  day,
  modifiers,
  className,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="text"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected={modifiers.selected}
      className={cn(
        "aspect-square size-auto w-full min-w-(--cell-size) border border-transparent text-base font-normal data-[selected=true]:border-foreground",
        className,
      )}
      {...props}
    />
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
          <ChevronLeft />
        </Button>
        <p className="w-10 text-center text-sm">
          {shown.toLocaleString(undefined, { month: "short" })}
        </p>
        <Button variant="text" size="icon" aria-label="Next month" onClick={() => shift(1)}>
          <ChevronRight />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="text" size="icon" aria-label="Previous year" onClick={() => shift(-12)}>
          <ChevronLeft />
        </Button>
        <p className="w-12 text-center text-sm">{shown.getFullYear()}</p>
        <Button variant="text" size="icon" aria-label="Next year" onClick={() => shift(12)}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

interface DatePickerProps {
  value?: Date[];
  onSelect?: (dates: Date[]) => void;
  onCancel?: () => void;
  className?: string;
}

function DatePicker({ value = [], onSelect, onCancel, className }: DatePickerProps) {
  const [draft, setDraft] = React.useState<Date[]>(value);

  return (
    <div className={cn("flex flex-col gap-4 border border-foreground p-4", className)}>
      <Calendar
        mode="multiple"
        selected={draft}
        onSelect={(dates) => setDraft(dates ?? [])}
        defaultMonth={value[0]}
      />
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => {
            setDraft(value);
            onCancel?.();
          }}
        >
          Cancel
        </Button>
        <Button variant="filled" onClick={() => onSelect?.(draft)}>
          Select
        </Button>
      </div>
    </div>
  );
}

export { DatePicker };