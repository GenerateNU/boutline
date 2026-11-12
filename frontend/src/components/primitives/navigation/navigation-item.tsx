import { cn } from "cn";
import Link from "next/link";

type NavigationSurface = "dark" | "light";

interface NavigationItemProps extends Omit<React.ComponentProps<typeof Link>, "children"> {
  label: string;
  active?: boolean;
  surface?: NavigationSurface;
}

function NavigationItem({
  label,
  active = false,
  surface = "dark",
  className,
  ...props
}: NavigationItemProps) {
  const light = surface === "light";

  return (
    <Link
      data-slot="navigation-item"
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-1 justify-center font-manrope text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        light
          ? cn(
              "h-10 px-1 pt-2.5 whitespace-nowrap",
              active ? "font-semibold text-obsidian" : "font-medium text-neutral-secondary hover:text-obsidian",
            )
          : cn("h-12 items-center rounded-xl px-4", active ? "text-white" : "text-neutral-muted hover:text-white"),
        className,
      )}
      {...props}
    >
      {/* Light tabs underline the whole tab; dark tabs underline just the label. */}
      <span className={cn("flex items-center", light ? "h-5" : "relative h-full")}>
        {label}
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-0 rounded-t-sm bg-accent-green",
            light ? "bottom-0 h-0.5" : "bottom-2 h-0.75",
            { hidden: !active },
          )}
        />
      </span>
    </Link>
  );
}

export { NavigationItem };
export type { NavigationSurface };
