import { cn } from "cn";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/primitives/button";

function Menu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="menu"
      className={cn("border border-foreground", className)}
      {...props}
    />
  );
}

interface MenuItemProps
  extends Omit<React.ComponentProps<typeof Button>, "asChild"> {
  icon?: React.ReactNode;
}

function MenuItem({ className, icon, children, ...props }: MenuItemProps) {
  return (
    <li>
      <Button
        type="button"
        variant="text"
        data-slot="menu-item"
        className={cn(
          "flex h-auto w-full justify-start gap-3 px-3 py-2 text-left font-normal",
          className,
        )}
        {...props}
      >
        {icon}
        <p className="flex-1 truncate">{children}</p>
        <ChevronRight aria-hidden />
      </Button>
    </li>
  );
}

export { Menu, MenuItem };
