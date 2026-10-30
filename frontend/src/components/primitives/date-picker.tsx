"use client";

import * as React from "react";
import { cn } from "cn";

import { Button } from "@/components/primitives/button";
import { Calendar } from "@/components/primitives/calendar";

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