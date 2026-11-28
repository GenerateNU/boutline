import { cn } from "cn";

import { buttonVariants } from "@/components/primitives/button";
import type { SelectOption } from "@/components/primitives/select-field";
import { SegmentedButton, SegmentedButtonItem } from "@/components/primitives/segmented-button";

const CHIP_CLASS_NAME = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "flex-none rounded-lg first:border-l data-[state=on]:bg-blue-lighter data-[state=on]:text-blue",
  // An invalid group borders each chip like an invalid form field.
  "group-aria-invalid/chip-group:border-2 group-aria-invalid/chip-group:border-red-dark group-aria-invalid/chip-group:px-2.75",
);

interface ChipGroupProps {
  label: string;
  // Optional so a disabled placeholder group needs no handlers.
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  // As on the form fields: set while a required choice is missing, pointing at the error.
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  className?: string;
  children: React.ReactNode;
}

function ChipGroup({
  label,
  value,
  onValueChange,
  disabled,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  className,
  children,
}: ChipGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-obsidian">{label}</p>
      <SegmentedButton
        type="single"
        aria-label={label}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        className={cn("group/chip-group flex gap-3 overflow-visible rounded-none border-0 shadow-none", className)}
      >
        {children}
      </SegmentedButton>
    </div>
  );
}

function ChipGroupItem({ className, ...props }: React.ComponentProps<typeof SegmentedButtonItem>) {
  return <SegmentedButtonItem className={cn(CHIP_CLASS_NAME, className)} {...props} />;
}

interface ChipGroupOptionsProps {
  options: SelectOption[];
}

// Equal-width items for a plain list of options.
function ChipGroupOptions({ options }: ChipGroupOptionsProps) {
  return options.map(({ value, label }) => (
    <ChipGroupItem key={value} value={value} className="flex-1">
      {label}
    </ChipGroupItem>
  ));
}

export { ChipGroup, ChipGroupItem, ChipGroupOptions };
