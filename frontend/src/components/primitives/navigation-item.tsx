import { cn } from "cn";

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
};

type NavigationItemProps = React.ComponentProps<"button"> & {
  icon: React.ReactNode;
  label?: string;
  selected?: boolean;
};

function NavigationItem({
  icon,
  label,
  selected = false,
  className,
  ...props
}: NavigationItemProps) {
  return (
    <button
      type="button"
      aria-current={selected ? "page" : undefined}
      className={cn(
        "flex size-16 flex-col items-center justify-center gap-1 border text-xs transition-colors hover:bg-muted [&_svg]:size-5",
        selected ? "border-foreground" : "border-transparent",
        className,
      )}
      {...props}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}

type NavigationDrawerItemProps = React.ComponentProps<"button"> & {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  selected?: boolean;
};

function NavigationDrawerItem({
  icon,
  label,
  badge,
  selected = false,
  className,
  ...props
}: NavigationDrawerItemProps) {
  return (
    <button
      type="button"
      aria-current={selected ? "page" : undefined}
      className={cn(
        "flex h-14 w-full items-center gap-3 border px-4 text-left transition-colors hover:bg-muted [&_svg]:size-5",
        selected ? "border-foreground" : "border-transparent",
        className,
      )}
      {...props}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge && <span className="text-sm">{badge}</span>}
    </button>
  );
}

export { NavigationItem, NavigationDrawerItem, type NavItem };