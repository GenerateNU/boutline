import { cn } from "cn";

import { Button } from "@/components/primitives/button";

interface NavigationRailItemProps extends React.ComponentProps<"button"> {
  icon: React.ReactNode;
  label?: string; // leave out for an icon-only item, and pass aria-label instead
  selected?: boolean;
}

function NavigationRailItem({
  icon,
  label,
  selected = false,
  className,
  ...props
}: NavigationRailItemProps) {
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

export { NavigationRailItem };