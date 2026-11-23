"use client";

import { cn } from "cn";
import { useState } from "react";

// Cards scrolled up fade into white under the fixed header. The fade only shows
// once the list has moved, so the first card isn't washed out at rest.
function FadingScrollArea({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  return (
    <div className="relative -mx-4 min-h-0 flex-1">
      <div
        aria-hidden
        data-testid="scroll-fade"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-linear-to-b from-fencing-white to-transparent transition-opacity",
          scrolled ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 0)}
        className="flex h-full flex-col gap-3 overflow-y-auto px-4 pb-6"
      >
        {children}
      </div>
    </div>
  );
}

export { FadingScrollArea };
