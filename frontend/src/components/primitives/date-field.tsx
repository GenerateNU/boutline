"use client";

import { format } from "date-fns";
import { cn } from "cn";
import CalendarTodayOutlined from "@mui/icons-material/CalendarTodayOutlined";
import { Popover } from "radix-ui";
import { useId, useState } from "react";

import { Button } from "@/components/primitives/button";
import { Calendar } from "@/components/primitives/calendar";
import { Modal } from "@/components/primitives/modal";
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
  presentation?: "popover" | "modal";
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
  presentation = "popover",
}: DateFieldProps) {
  const fallbackId = useId();
  const triggerId = id ?? fallbackId;
  const calendarId = `${triggerId}-calendar`;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const trigger = (
    <button
      id={triggerId}
      type="button"
      role="combobox"
      aria-expanded={open}
      aria-controls={open && presentation === "popover" ? calendarId : undefined}
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
  );

  return (
    <div data-slot="date-field" className={cn("group flex flex-col gap-1", className)}>
      <label
        htmlFor={triggerId}
        className="text-xs font-medium text-neutral-secondary group-has-disabled:text-neutral-muted"
      >
        {label}
        {required ? <span aria-hidden className="text-red-dark"> *</span> : null}
      </label>
      {presentation === "modal" ? (
        <Modal
          open={open}
          onOpenChange={(next) => {
            if (next) {
              setDraft(value);
            }
            setOpen(next);
          }}
          title="Calendar"
          trigger={trigger}
        >
          <Calendar
            mode="single"
            required
            autoFocus
            selected={draft}
            defaultMonth={draft}
            modifiers={{ hasEvent: eventDates }}
            onSelect={setDraft}
          />
          <Button
            type="button"
            className="w-full rounded-lg"
            disabled={!draft}
            onClick={() => {
              if (draft) {
                onValueChange(draft);
              }
              setOpen(false);
            }}
          >
            Choose Date
          </Button>
        </Modal>
      ) : (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>{trigger}</Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              id={calendarId}
              aria-label="Calendar"
              align="start"
              sideOffset={4}
              collisionPadding={16}
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
      )}
    </div>
  );
}

export { DateField };
