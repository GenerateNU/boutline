"use client";

import { cn } from "cn";
import { Search } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/primitives/input";

interface SearchBarProps extends React.ComponentProps<"input"> {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  expanded?: boolean;
  children?: React.ReactNode;
}

function SearchBar({
  className,
  leading,
  trailing,
  expanded,
  children,
  ...props
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const open = expanded ?? focused;

  return (
    <div
      data-slot="search-bar"
      role="search"
      className={cn("relative", className)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
        }
      }}
    >
      <div className="flex h-11.5 items-center gap-2 rounded-lg border border-outline bg-background px-3 focus-within:border-blue">
        {leading}
        <Input
          type="text"
          className="h-auto w-auto min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-sm text-obsidian placeholder:text-neutral-muted focus-visible:ring-0"
          {...props}
        />
        <Search aria-hidden className="size-4 text-neutral-secondary" />
        {trailing}
      </div>
      {open ? (
        <div
          data-slot="search-bar-results"
          className="absolute inset-x-0 top-full z-10 mt-1"
          onMouseDown={(event) => event.preventDefault()}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export { SearchBar };
