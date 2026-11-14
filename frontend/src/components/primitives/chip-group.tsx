"use client";

import { cn } from "cn";

import { buttonVariants } from "@/components/primitives/button";
import type { SelectOption } from "@/components/primitives/select-field";
import {
  SegmentedButton,
  SegmentedButtonItem,
} from "@/components/primitives/segmented-button";

const CHIP_CLASS_NAME = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "flex-1 rounded-lg first:border-l data-[state=on]:bg-blue data-[state=on]:text-white data-[state=on]:hover:bg-blue-dark",
);

interface ChipGroupProps {
  label: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
}

function ChipGroup({ label, value, onValueChange, options, disabled }: ChipGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-obsidian">{label}</p>
      <SegmentedButton
        type="single"
        aria-label={label}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        className="flex gap-3 overflow-visible rounded-none border-0 shadow-none"
      >
        {options.map(({ value: optionValue, label: optionLabel }) => (
          <SegmentedButtonItem key={optionValue} value={optionValue} className={CHIP_CLASS_NAME}>
            {optionLabel}
          </SegmentedButtonItem>
        ))}
      </SegmentedButton>
    </div>
  );
}

export { ChipGroup };
