import { cn } from "cn";
import Link from "next/link";

interface NavigationItemProps extends Omit<React.ComponentProps<typeof Link>, "children"> {
  label: string;
  active?: boolean;
}

function NavigationItem({ label, active = false, className, ...props }: NavigationItemProps) {
  return (
    <Link
      data-slot="navigation-item"
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-12 flex-1 items-center justify-center font-manrope rounded-xl px-4 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        active ? "text-white" : "text-neutral-muted hover:text-white",
        className,
      )}
      {...props}
    >
      <span className="relative flex h-full items-center">
        {label}
        <span
          aria-hidden
          className={cn("absolute inset-x-0 bottom-2 h-0.75 rounded-t-sm bg-accent-green", {
            hidden: !active,
          })}
        />
      </span>
    </Link>
  );
}

export { NavigationItem };
