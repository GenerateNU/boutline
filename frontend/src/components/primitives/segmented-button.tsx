"use client";

import { cn } from "cn";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";

function SegmentedButton({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="segmented-button"
      className={cn(
        "inline-flex overflow-hidden rounded-full border border-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SegmentedButtonItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="segmented-button-item"
      className={cn(
        "flex-1 border-l border-foreground px-5 py-2 text-sm whitespace-nowrap outline-none transition-colors first:border-l-0 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[state=on]:text-selected",
        className,
      )}
      {...props}
    />
  );
}

export { SegmentedButton, SegmentedButtonItem };
