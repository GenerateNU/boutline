"use client";

import { cn } from "cn";
import { Slider as SliderPrimitive } from "radix-ui";

function Slider({
  className,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-none items-center data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-foreground" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="grid size-5 place-items-center rounded-full bg-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="size-1.5 rounded-full bg-background" />
      </SliderPrimitive.Thumb>
    </SliderPrimitive.Root>
  );
}

export { Slider };
