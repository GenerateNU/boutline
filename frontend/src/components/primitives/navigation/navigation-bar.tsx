import { cn } from "cn";

import {
  NavigationItem,
  type NavigationSurface,
} from "@/components/primitives/navigation/navigation-item";

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
  return (
    <nav
      data-slot="navigation-bar"
      className={cn(
        "flex",
        surface === "light" ? "border-b border-outline" : "rounded-xl bg-obsidian",
        className,
      )}
      {...props}
    >
      {items.map(({ label, href, active, replace }) => (
        <NavigationItem
          key={label}
          label={label}
          href={href}
          active={active}
          replace={replace}
          surface={surface}
        />
      ))}
    </nav>
  );
}

export { NavigationBar };
export type { NavigationBarItem };
