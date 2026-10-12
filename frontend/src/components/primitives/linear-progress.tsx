"use client";

import { cn } from "cn";
import { Progress as ProgressPrimitive } from "radix-ui";

function LinearProgress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="linear-progress"
      value={value}
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-border",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="linear-progress-indicator"
        className="size-full flex-1 rounded-full bg-foreground transition-all"
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { LinearProgress };
