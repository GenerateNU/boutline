import { cn } from "cn";
import { ChevronRight } from "lucide-react";

function Menu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="menu"
      className={cn("border border-foreground", className)}
      {...props}
    />
  );
}

type MenuItemProps = React.ComponentProps<"button"> & {
  icon?: React.ReactNode;
};

function MenuItem({ className, icon, children, ...props }: MenuItemProps) {
  return (
    <li>
      <button
        type="button"
        data-slot="menu-item"
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4",
          className,
        )}
        {...props}
      >
        {icon}
        <p className="flex-1 truncate">{children}</p>
        <ChevronRight aria-hidden />
      </button>
    </li>
  );
}

export { Menu, MenuItem };
