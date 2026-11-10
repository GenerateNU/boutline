"use client";

import { cn } from "cn";
import { Slider as SliderPrimitive } from "radix-ui";
import { useState } from "react";

interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  unit?: string;
  showValue?: boolean;
}

function Slider({
  className,
  unit,
  showValue,
  min = 0,
  max = 100,
  value,
  defaultValue,
  onValueChange,
  ...props
}: SliderProps) {
  // Radix doesn't expose its internal value when uncontrolled, so mirror it for the bubble.
  const [current, setCurrent] = useState(value ?? defaultValue ?? [min]);
  const shown = value ?? current;

  return (
    <div data-slot="slider-wrapper" className={cn("w-full", className)}>
      <SliderPrimitive.Root
        data-slot="slider"
        min={min}
        max={max}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(next) => {
          setCurrent(next);
          onValueChange?.(next);
        }}
        className="relative flex w-full cursor-pointer touch-none items-center data-disabled:cursor-not-allowed data-disabled:opacity-50"
        {...props}
      >
        <SliderPrimitive.Track className="relative h-0.5 grow rounded-full bg-blue">
          <SliderPrimitive.Range className="absolute h-full" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="relative block size-3 rounded-full bg-blue outline-none focus-visible:ring-3 focus-visible:ring-blue-lighter">
          {showValue && (
            <p className="absolute bottom-full left-1/2 mb-2.5 -translate-x-1/2 rounded-md bg-blue-lighter px-3 py-1.5 text-sm font-medium text-obsidian after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-x-6 after:border-t-6 after:border-x-transparent after:border-t-blue-lighter">
              {shown[0]}
            </p>
          )}
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Root>
      {unit && (
        <div className="mt-2 flex justify-between text-xs font-medium uppercase text-neutral-secondary">
          <p>
            {min} {unit}
          </p>
          <p>
            {max} {unit}
          </p>
        </div>
      )}
    </div>
  );
}

export { Slider };
