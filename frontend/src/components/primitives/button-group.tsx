"use client";

import { cn } from "cn";
import { ReactNode, useEffect, useRef } from "react";

import { Button } from "@/components/primitives/button";
import { useScrollEdges } from "@/lib/hooks/use-scroll-edges";

interface ButtonGroupOption {
  value: string;
  label: ReactNode;
}

interface ButtonGroupProps {
  options: ButtonGroupOption[];
  value: string;
  onValueChange: (value: string) => void;
  "aria-label": string;
  className?: string;
}

// A row of equal-width buttons where exactly one is selected, e.g. a round or filter picker.
// When the buttons don't fit, the row scrolls sideways and fades the edge that has more.
function ButtonGroup({
  options,
  value,
  onValueChange,
  "aria-label": ariaLabel,
  className,
}: ButtonGroupProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight } = useScrollEdges(scrollerRef);

  // Centre the selected button so a value set from outside (e.g. swiping the
  // tableau bracket) never leaves it hidden off an edge. scroll-smooth animates it.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const selected = scroller?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!scroller || !selected) {
      return;
    }
    scroller.scrollLeft =
      selected.offsetLeft - (scroller.clientWidth - selected.offsetWidth) / 2;
  }, [value]);

  // Scrolling clips overflow on both axes, so -my-1 py-1 leaves room for the
  // buttons' shadows and focus rings without shifting the row.
  return (
    <div
      ref={scrollerRef}
      data-slot="button-group"
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "relative -my-1 flex scroll-smooth gap-2 overflow-x-auto py-1 [scrollbar-width:none]",
        canScrollLeft && "mask-l-from-[calc(100%-2.5rem)]",
        canScrollRight && "mask-r-from-[calc(100%-2.5rem)]",
        className,
      )}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          variant={option.value === value ? "filled" : "outline"}
          aria-pressed={option.value === value}
          className="flex-1 rounded-md px-2"
          onClick={() => onValueChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

export { ButtonGroup };
