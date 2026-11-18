import { cn } from "cn";

import {
  NavigationItem,
  type NavigationSurface,
} from "@/components/primitives/navigation/navigation-item";

const TAB_STAGGER_MS = 60;

interface NavigationBarItem {
  label: string;
  href: string;
  active?: boolean;
  replace?: boolean;
}

interface NavigationBarProps extends React.ComponentProps<"nav"> {
  items: NavigationBarItem[];
  surface?: NavigationSurface;
}

function NavigationBar({ items, surface = "dark", className, ...props }: NavigationBarProps) {
  const activeIndex = items.findIndex(({ active }) => active);

  return (
    <nav
      data-slot="navigation-bar"
      className={cn(
        "relative flex",
        surface === "light" ? "border-b border-outline" : "rounded-xl bg-obsidian",
        className,
      )}
      {...props}
    >
      {items.map(({ label, href, active, replace }, index) => (
        <NavigationItem
          key={label}
          label={label}
          href={href}
          active={active}
          replace={replace}
          surface={surface}
          style={{ animationDelay: `${index * TAB_STAGGER_MS}ms` }}
        />
      ))}
      {/* One indicator anchored to the active tab, so it slides along when the anchor moves to another. */}
      {surface === "dark" && activeIndex !== -1 && (
        <span
          aria-hidden
          data-slot="navigation-indicator"
          className="absolute right-[anchor(right)] bottom-2 left-[anchor(left)] hidden h-0.75 rounded-t-sm bg-accent-green [position-anchor:--active-tab] supports-[anchor-name:--a]:block lg:motion-safe:animate-tab-in motion-safe:transition-[left,right] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.65,0,0.35,1)]"
          style={{ animationDelay: `${activeIndex * TAB_STAGGER_MS}ms` }}
        />
      )}
    </nav>
  );
}

export { NavigationBar };
export type { NavigationBarItem };
