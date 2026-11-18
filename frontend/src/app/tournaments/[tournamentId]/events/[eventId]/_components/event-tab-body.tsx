"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "cn";

import { Background } from "@/components/primitives/background";

interface EventTabBodyProps {
  children: React.ReactNode;
}

// Every tab sits in the centred mobile column except the tableau, which fills the screen
// under the tabs over its own background so the bracket runs off the screen edge and the
// event title floats over the pattern.
function EventTabBody({ children }: EventTabBodyProps) {
  const tableau = useSelectedLayoutSegment() === "tableau";

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-4 px-4 pt-4 pb-20",
        tableau
          ? "relative isolate min-h-[calc(100dvh-5.5rem)] overflow-clip bg-fencing-white lg:min-h-[calc(100dvh-2.5rem)]"
          : "max-w-mobile",
      )}
    >
      {tableau && <Background version={7} />}
      {children}
    </div>
  );
}

export { EventTabBody };
