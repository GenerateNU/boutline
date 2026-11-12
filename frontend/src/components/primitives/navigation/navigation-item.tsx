import { cn } from "cn";
import Link from "next/link";

type NavigationSurface = "dark" | "light";

const surfaces = {
  dark: {
    item: "h-12 items-center rounded-xl px-4",
    active: "text-white",
    idle: "text-neutral-muted hover:text-white",
    label: "relative h-full",
    indicator: "bottom-2 h-0.75",
  },
  light: {
    item: "h-10 px-1 pt-2.5 whitespace-nowrap",
    active: "font-semibold text-obsidian",
    idle: "font-medium text-neutral-secondary hover:text-obsidian",
    label: "h-5",
    indicator: "bottom-0 h-0.5",
  },
};

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
  const styles = surfaces[surface];

  return (
    <Link
      data-slot="navigation-item"
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-1 justify-center font-manrope text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        styles.item,
        active ? styles.active : styles.idle,
        className,
      )}
      {...props}
    >
      <span className={cn("flex items-center", styles.label)}>
        {label}
        <span
          aria-hidden
          className={cn("absolute inset-x-0 rounded-t-sm bg-accent-green", styles.indicator, {
            hidden: !active,
          })}
        />
      </span>
    </Link>
  );
}

export { NavigationItem };
export type { NavigationSurface };
