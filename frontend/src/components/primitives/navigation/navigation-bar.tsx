import { cn } from "cn";

import { NavigationItem } from "@/components/primitives/navigation/navigation-item";

interface NavigationBarItem {
  label: string;
  href: string;
  active?: boolean;
  replace?: boolean;
}

interface NavigationBarProps extends React.ComponentProps<"nav"> {
  items: NavigationBarItem[];
}

function NavigationBar({ items, className, ...props }: NavigationBarProps) {
  return (
    <nav
      data-slot="navigation-bar"
      className={cn("flex rounded-xl bg-obsidian", className)}
      {...props}
    >
      {items.map(({ label, href, active, replace }) => (
        <NavigationItem key={label} label={label} href={href} active={active} replace={replace} />
      ))}
    </nav>
  );
}

export { NavigationBar };
export type { NavigationBarItem };
