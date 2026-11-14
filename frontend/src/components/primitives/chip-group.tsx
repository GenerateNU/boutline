import { cn } from "cn";

import { buttonVariants } from "@/components/primitives/button";
import type { SelectOption } from "@/components/primitives/select-field";
import { SegmentedButton, SegmentedButtonItem } from "@/components/primitives/segmented-button";

const CHIP_CLASS_NAME = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "flex-none rounded-lg first:border-l data-[state=on]:bg-blue data-[state=on]:text-white data-[state=on]:hover:bg-blue-dark",
);

interface ChipGroupProps {
  label: string;
  // Optional so a disabled placeholder group needs no handlers.
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

function ChipGroup({ label, value, onValueChange, disabled, className, children }: ChipGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-obsidian">{label}</p>
      <SegmentedButton
        type="single"
        aria-label={label}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        className={cn("flex gap-3 overflow-visible rounded-none border-0 shadow-none", className)}
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
