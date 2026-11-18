import { cn } from "cn";
import Link from "next/link";

type NavigationSurface = "dark" | "light";

const SURFACES = {
  dark: {
    item: "h-12 items-center rounded-xl px-4 lg:h-full lg:flex-none lg:motion-safe:animate-tab-in",
    active: "text-white lg:[anchor-name:--active-tab]",
    idle: "text-neutral-muted hover:text-white",
    // On laptops the indicator spans the whole tab rather than just its label.
    label: "relative h-full lg:static",
    // NavigationBar draws the laptop indicator instead, wherever anchor positioning lets it slide.
    indicator: "bottom-2 h-0.75 lg:supports-[anchor-name:--a]:hidden",
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
  const styles = SURFACES[surface];

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
