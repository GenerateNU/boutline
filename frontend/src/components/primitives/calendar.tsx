"use client";

import * as React from "react";
import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
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
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      hideNavigation
      className={cn("w-full bg-background", className)}
      formatters={{
        formatWeekdayName: (date) =>
          date.toLocaleString(undefined, { weekday: "narrow" }),
      }}
      classNames={{
        month: "flex w-full flex-col gap-3",
        month_grid: "w-full border-collapse",
        weekdays: "flex justify-between",
        weekday: "w-10 text-xs font-medium text-neutral-secondary select-none",
        week: "mt-1 flex w-full justify-between",
        day: "size-10 p-0 text-center select-none",
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
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (modifiers.focused) {
      ref.current?.focus();
    }
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="text"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected={modifiers.selected}
      data-today={modifiers.today}
      data-outside={modifiers.outside}
      className={cn(
        "relative border border-transparent text-sm text-obsidian disabled:opacity-50",
        "data-[outside=true]:text-neutral-muted",
        "data-[today=true]:border-[1.5px] data-[today=true]:border-blue data-[today=true]:font-semibold",
        "data-[selected=true]:bg-blue data-[selected=true]:font-semibold data-[selected=true]:text-white data-[selected=true]:hover:bg-blue-dark",
        className,
      )}
      {...props}
    >
      {children}
      {/* Callers mark days with events via modifiers={{ hasEvent: Date[] }}. */}
      {modifiers.hasEvent && (
        <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-accent-green" />
      )}
    </Button>
  );
}

function CalendarCaption({ calendarMonth }: MonthCaptionProps) {
  const { goToMonth } = useDayPicker();
  const shown = calendarMonth.date;
  const shift = (months: number) =>
    goToMonth(new Date(shown.getFullYear(), shown.getMonth() + months, 1));

  return (
    <div className="flex items-center justify-center gap-12.5 pb-1 text-sm font-semibold text-obsidian">
      <Stepper
        label={shown.toLocaleString(undefined, { month: "long" })}
        unit="month"
        onStep={shift}
      />
      <Stepper
        label={String(shown.getFullYear())}
        unit="year"
        onStep={(step) => shift(step * 12)}
      />
    </div>
  );
}

interface StepperProps {
  label: string;
  unit: string;
  onStep: (step: number) => void;
}

const stepClassName = "size-6 text-obsidian [&_svg]:size-6";

function Stepper({ label, unit, onStep }: StepperProps) {
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="text"
        size="icon"
        aria-label={`Previous ${unit}`}
        onClick={() => onStep(-1)}
        className={stepClassName}
      >
        <ChevronLeftOutlined />
      </Button>
      <p className="min-w-10 text-center">{label}</p>
      <Button
        type="button"
        variant="text"
        size="icon"
        aria-label={`Next ${unit}`}
        onClick={() => onStep(1)}
        className={stepClassName}
      >
        <ChevronRightOutlined />
      </Button>
    </div>
  );
}

export { Calendar };
