"use client";

import { cn } from "cn";

import { useEventTab } from "../_hooks/use-event-tab";

interface EventTabBodyProps {
  children: React.ReactNode;
}

// Every tab sits in the centred mobile column; Pools leaves it on laptops to lay out side by side.
function EventTabBody({ children }: EventTabBodyProps) {
  const tab = useEventTab();

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-mobile flex-col gap-4 px-4 pt-4 pb-20",
        tab === "pooling" && "lg:max-w-none lg:px-10",
      )}
    >
      {children}
    </div>
  );
}

export { EventTabBody };
