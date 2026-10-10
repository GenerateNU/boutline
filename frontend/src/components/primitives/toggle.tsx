"use client";

import { cn } from "cn";
import { Switch as SwitchPrimitive } from "radix-ui";

// Built on Radix's Switch, not its Toggle — Radix `Toggle` is a pressable
// button, which is what SegmentItem uses.
function Toggle({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="toggle"
      className={cn(
        "inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 data-[state=checked]:bg-selected data-[state=unchecked]:bg-foreground",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-6 rounded-full bg-background transition-transform data-[state=checked]:translate-x-5" />
    </SwitchPrimitive.Root>
  );
}

export { Toggle };
