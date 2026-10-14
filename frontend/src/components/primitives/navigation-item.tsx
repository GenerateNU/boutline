import { cn } from "cn";

import { Button } from "@/components/primitives/button";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavigationItemProps extends React.ComponentProps<"button"> {
  icon: React.ReactNode;
  label?: string;
  selected?: boolean;
}

function NavigationItem({
  icon,
  label,
  selected = false,
  className,
  ...props
}: NavigationItemProps) {
  return (
    <Button
      type="button"
      variant="text"
      aria-current={selected ? "page" : undefined}
      className={cn(
        "size-16 flex-col gap-1 border px-0 text-xs font-normal [&_svg]:size-5",
        selected ? "border-foreground" : "border-transparent",
        className,
      )}
      {...props}
    >
      {icon}
      {label && <span>{label}</span>}
    </Button>
  );
}

interface NavigationDrawerItemProps extends React.ComponentProps<"button"> {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  selected?: boolean;
}

function NavigationDrawerItem({
  icon,
  label,
  badge,
  selected = false,
  className,
  ...props
}: NavigationDrawerItemProps) {
  return (
    <Button
      type="button"
      variant="text"
      aria-current={selected ? "page" : undefined}
      className={cn(
        "h-14 w-full justify-start gap-3 border px-4 text-base font-normal [&_svg]:size-5",
        selected ? "border-foreground" : "border-transparent",
        className,
      )}
      {...props}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge && <span className="text-sm">{badge}</span>}
    </Button>
  );
}

export { NavigationItem, NavigationDrawerItem };