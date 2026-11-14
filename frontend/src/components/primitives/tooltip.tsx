"use client";

import { cn } from "cn";
import { Tooltip as TooltipPrimitive } from "radix-ui";

const TooltipTrigger = TooltipPrimitive.Trigger;

function Tooltip({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipPrimitive.Provider>
  );
}

function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-mobile origin-(--radix-tooltip-content-transform-origin) bg-foreground px-4 py-2 text-sm text-background motion-safe:data-[state=closed]:animate-pop-out motion-safe:data-[state=delayed-open]:animate-pop-in motion-safe:data-[state=instant-open]:animate-pop-in",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent };
