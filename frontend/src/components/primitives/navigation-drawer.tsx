"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { cn } from "cn";

import { Avatar, AvatarFallback } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import {
  NavigationDrawerItem,
  NavigationItem,
  NavItem,
} from "@/components/primitives/navigation-item";

type NavigationDrawerProps = {
  title: string;
  items: NavItem[];
  footerItems?: NavItem[];
  userName: string;
  className?: string;
};

function NavigationDrawer({
  title,
  items,
  footerItems = [],
  userName,
  className,
}: NavigationDrawerProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [selected, setSelected] = React.useState(items[0]?.id);

  // Close the expanded drawer with Esc
  React.useEffect(() => {
    if (!expanded) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expanded]);

  // Picking an item in the expanded drawer selects it and closes the drawer
  const selectAndClose = (id: string) => {
    setSelected(id);
    setExpanded(false);
  };

  return (
    <>
      <nav
        aria-label="Main"
        className={cn(
          "flex w-20 flex-col items-center border border-foreground bg-background py-4",
          className,
        )}
      >
        <Button
          variant="text"
          size="icon"
          aria-label="Open menu"
          aria-expanded={expanded}
          onClick={() => setExpanded(true)}
        >
          <Menu />
        </Button>
        <div className="mt-10 flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto">
          {items.map((item) => (
            <NavigationItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              selected={item.id === selected}
              onClick={() => setSelected(item.id)}
            />
          ))}
        </div>
        <div className="flex w-full shrink-0 flex-col items-center gap-3 border-t border-foreground pt-2">
          {footerItems.map((item) => (
            <NavigationItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              selected={item.id === selected}
              onClick={() => setSelected(item.id)}
            />
          ))}
          <Avatar>
            <AvatarFallback />
          </Avatar>
        </div>
      </nav>

      {/* Dim layer behind the expanded drawer; tapping it closes the drawer */}
      <div
        aria-hidden
        onClick={() => setExpanded(false)}
        className={cn(
          "fixed inset-0 z-40 bg-foreground/20 transition-opacity",
          expanded ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Expanded drawer: slides in on top/over the page */}
      <nav
        aria-label="Main, expanded"
        inert={!expanded}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-foreground bg-background py-4 transition-transform",
          expanded ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 px-2">
          <Button
            variant="text"
            size="icon"
            aria-label="Close menu"
            onClick={() => setExpanded(false)}
          >
            <Menu />
          </Button>
          <span className="text-lg font-semibold">{title}</span>
        </div>
        <div className="mt-6 flex flex-1 flex-col">
          {items.map((item) => (
            <NavigationDrawerItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              badge={item.badge}
              selected={item.id === selected}
              onClick={() => selectAndClose(item.id)}
            />
          ))}
        </div>
        <div className="border-t border-foreground pt-2">
          {footerItems.map((item) => (
            <NavigationDrawerItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              selected={item.id === selected}
              onClick={() => selectAndClose(item.id)}
            />
          ))}
          <div className="flex items-center gap-3 px-4 py-2">
            <Avatar>
              <AvatarFallback />
            </Avatar>
            <span>{userName}</span>
          </div>
        </div>
      </nav>
    </>
  );
}

export { NavigationDrawer };