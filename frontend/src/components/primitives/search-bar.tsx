"use client";

import { cn } from "cn";
import { Menu as MenuIcon, Search } from "lucide-react";
import { useState } from "react";

type SearchBarProps = React.ComponentProps<"input"> & {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  expanded?: boolean;
  children?: React.ReactNode;
};

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
      className={cn("border border-foreground", className)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
        }
      }}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        {leading ?? <MenuIcon aria-hidden className="size-5" />}
        <input
          type="text"
          className="min-w-0 flex-1 text-sm outline-none placeholder:text-muted-foreground"
          {...props}
        />
        <Search aria-hidden className="size-5" />
        {trailing}
      </div>
      {open ? (
        <div
          data-slot="search-bar-results"
          className="border-t border-border"
          onMouseDown={(event) => event.preventDefault()}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export { SearchBar };
