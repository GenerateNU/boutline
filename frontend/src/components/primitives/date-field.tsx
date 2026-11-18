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
  value: Date | undefined;
  onValueChange: (date: Date) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  className?: string;
  eventDates?: Date[];
}

function DateField({
  label,
  value,
  onValueChange,
  placeholder = "Select date",
  id,
  required,
  disabled,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  className,
  eventDates = [],
}: DateFieldProps) {
  const fallbackId = useId();
  const triggerId = id ?? fallbackId;
  const calendarId = `${triggerId}-calendar`;
  const [open, setOpen] = useState(false);

  return (
    <div data-slot="date-field" className={cn("group flex flex-col gap-1", className)}>
      <label
        htmlFor={triggerId}
        className="text-xs font-medium text-neutral-secondary group-has-disabled:text-neutral-muted"
      >
        {label}
        {required ? <span aria-hidden className="text-red-dark"> *</span> : null}
      </label>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          {/* combobox, as Radix gives Select's trigger, so it can carry aria-invalid and reads its label rather than its text. */}
          <button
            id={triggerId}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? calendarId : undefined}
            disabled={disabled}
            aria-required={required}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
            data-placeholder={value ? undefined : ""}
            className={selectTriggerClassName}
          >
            <span className="truncate">{value ? format(value, "MMM d, yyyy") : placeholder}</span>
            <CalendarTodayOutlined aria-hidden className="size-4 shrink-0 text-neutral-secondary" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            id={calendarId}
            aria-label="Calendar"
            align="start"
            sideOffset={4}
            collisionPadding={16}
            // The calendar focuses the picked day (or today) itself, rather than its first arrow.
            onOpenAutoFocus={(event) => event.preventDefault()}
            className="z-50 w-76 origin-(--radix-popover-content-transform-origin) rounded-xl border border-outline bg-background p-3 shadow-md outline-none motion-safe:data-[state=open]:animate-pop-in motion-safe:data-[state=closed]:animate-pop-out"
          >
            <Calendar
              mode="single"
              required
              autoFocus
              selected={value}
              defaultMonth={value}
              modifiers={{ hasEvent: eventDates }}
              onSelect={(next) => {
                onValueChange(next);
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
