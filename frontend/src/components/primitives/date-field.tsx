"use client";

import { format } from "date-fns";
import { cn } from "cn";
import CalendarTodayOutlined from "@mui/icons-material/CalendarTodayOutlined";
import { Popover } from "radix-ui";
import { useId, useState } from "react";

import { Calendar } from "@/components/primitives/calendar";
import { selectTriggerClassName } from "@/components/primitives/select";

interface DateFieldProps {
  label: React.ReactNode;
  defaultValue?: Date;
  onValueChange?: (date: Date) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  className?: string;
  eventDates?: Date[];
}

function DateField({
  label,
  defaultValue,
  onValueChange,
  placeholder = "Select a date",
  id,
  disabled,
  "aria-invalid": ariaInvalid,
  className,
  eventDates = [],
}: DateFieldProps) {
  const fallbackId = useId();
  const triggerId = id ?? fallbackId;
  const [date, setDate] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  return (
    <div data-slot="date-field" className={cn("flex flex-col gap-1", className)}>
      <label
        htmlFor={triggerId}
        className={cn(
          "text-xs font-medium text-neutral-secondary",
          { "text-neutral-muted": disabled },
        )}
      >
        {label}
      </label>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            id={triggerId}
            type="button"
            disabled={disabled}
            data-placeholder={date ? undefined : ""}
            // A plain button can't carry aria-invalid, so the error shows as the border alone.
            className={cn(
              selectTriggerClassName,
              "focus-visible:border-accent-green focus-visible:ring-mint-light data-[state=open]:border-accent-green data-[state=open]:ring-mint-light",
              ariaInvalid && "border-red-dark",
            )}
          >
            <p>{date ? format(date, "MMM d, yyyy") : placeholder}</p>
            <CalendarTodayOutlined aria-hidden className="size-4 text-neutral-secondary" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            className="z-50 rounded-lg shadow-md outline-none"
          >
            <Calendar
              mode="single"
              required
              selected={date}
              defaultMonth={date}
              modifiers={{ hasEvent: eventDates }}
              onSelect={(next) => {
                setDate(next);
                onValueChange?.(next);
                setOpen(false);
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

export { DateField };
