"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "cn";

import { Background } from "@/components/primitives/background";

interface EventTabBodyProps {
  children: React.ReactNode;
}

// Every tab sits in the centred mobile column except the tableau, which fills the screen
// under the tabs over its own background so the bracket runs off the screen edge and the
// event title floats over the pattern. Pools leave the column on laptops to lay out side by side.
function EventTabBody({ children }: EventTabBodyProps) {
  const segment = useSelectedLayoutSegment();
  const tableau = segment === "tableau";

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-4 px-4 pt-4 pb-20",
        tableau
          ? "relative isolate min-h-[calc(100dvh-5.5rem)] overflow-clip bg-fencing-white lg:min-h-[calc(100dvh-2.5rem)]"
          : "max-w-mobile",
        segment === "pooling" && "lg:max-w-none",
      )}
    >
      {tableau && <Background version={7} />}
      {children}
    </div>
  );
}

export { EventTabBody };
