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
        "relative flex w-full cursor-pointer touch-none items-center data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-0.5 grow overflow-hidden rounded-full bg-blue-light">
        <SliderPrimitive.Range className="absolute h-full bg-blue" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-4 rounded-full bg-blue outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </SliderPrimitive.Root>
  );
}

export { Slider };
