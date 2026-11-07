"use client";

import { cn } from "cn";

import { Button } from "@/components/primitives/button";

interface ButtonGroupOption {
  value: string;
  label: React.ReactNode;
}

interface ButtonGroupProps {
  options: ButtonGroupOption[];
  value: string;
  onValueChange: (value: string) => void;
  "aria-label": string;
  className?: string;
}

// A row of equal-width buttons where exactly one is selected, e.g. a round or filter picker.
function ButtonGroup({
  options,
  value,
  onValueChange,
  "aria-label": ariaLabel,
  className,
}: ButtonGroupProps) {
  return (
    <div
      data-slot="button-group"
      role="group"
      aria-label={ariaLabel}
      className={cn("flex gap-2", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Button
            key={option.value}
            variant={selected ? "filled" : "outline"}
            aria-pressed={selected}
            className="flex-1 rounded-md px-2"
            onClick={() => onValueChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

export { ButtonGroup };
