"use client";

import { cn } from "cn";
import { Toggle as TogglePrimitive } from "radix-ui";

const POSITION_STYLES = {
  start: "rounded-l-full",
  middle: "rounded-none",
  end: "rounded-r-full",
};

type SegmentItemProps = React.ComponentProps<typeof TogglePrimitive.Root> & {
  position?: keyof typeof POSITION_STYLES;
};

function SegmentItem({
  className,
  position = "middle",
  ...props
}: SegmentItemProps) {
  return (
    <TogglePrimitive.Root
      data-slot="segment-item"
      className={cn(
        "inline-flex cursor-pointer items-center justify-center border border-foreground px-6 py-2 text-sm whitespace-nowrap outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:text-selected",
        POSITION_STYLES[position],
        className,
      )}
      {...props}
    />
  );
}

export { SegmentItem };
