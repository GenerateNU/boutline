import { cn } from "cn";

// The highlight is a pseudo-element parked off the left edge. With reduced motion
// it never animates, so the block stays a flat placeholder.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-surface before:absolute before:inset-0 before:-translate-x-full before:bg-linear-to-r before:from-transparent before:via-background/60 before:to-transparent motion-safe:before:animate-shimmer",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
