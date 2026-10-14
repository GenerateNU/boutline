import { cn } from "cn";

import { Button } from "@/components/primitives/button";

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

export { NavigationDrawerItem };