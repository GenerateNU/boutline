"use client";

import * as React from "react";
import { cn } from "cn";

import {
  NavigationItem,
  NavItem,
} from "@/components/primitives/navigation/navigation-item";

interface NavigationBarProps {
  items: NavItem[];
  className?: string;
}

function NavigationBar({ items, className }: NavigationBarProps) {
  const [selected, setSelected] = React.useState(items[0]?.id);

  return (
    <nav
      aria-label="Main"
      className={cn(
        "flex w-full items-center justify-around border border-foreground bg-background py-2",
        className,
      )}
    >
      {items.map((item) => (
        <NavigationItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          selected={item.id === selected}
          onClick={() => setSelected(item.id)}
        />
      ))}
    </nav>
  );
}

export { NavigationBar };