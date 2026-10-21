"use client";

import { cn } from "cn";
import { Progress as ProgressPrimitive } from "radix-ui";

function LinearProgress({
  className,
  value,
  max = 100,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const percent = ((value ?? 0) / max) * 100;

  return (
    <ProgressPrimitive.Root
      data-slot="linear-progress"
      value={value}
      max={max}
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-border",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="linear-progress-indicator"
        className="size-full flex-1 rounded-full bg-foreground transition-all"
        style={{ transform: `translateX(-${100 - percent}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { LinearProgress };
