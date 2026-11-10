import { cva } from "class-variance-authority";
import { cn } from "cn";
import { ChevronDown, X } from "lucide-react";

const chipVariants = cva(
  "inline-flex items-center rounded-md border bg-background text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        tag: "gap-1 border-outline px-2.5 py-1.5 text-obsidian [&_svg]:size-3.5 [&_svg]:shrink-0",
        option:
          "cursor-pointer justify-center border-blue px-3 py-1.5 text-blue outline-none transition-colors hover:bg-blue-lightest focus-visible:ring-3 focus-visible:ring-blue-lighter aria-pressed:bg-blue aria-pressed:text-white data-[state=on]:bg-blue data-[state=on]:text-white",
      },
    },
  },
);

interface ChipProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
  dropdown?: boolean;
  selected?: boolean;
}

function Chip({
  className,
  icon,
  dismissible,
  onDismiss,
  dismissLabel = "Remove",
  dropdown,
  selected,
  children,
  ...props
}: ChipProps) {
  const removable = dismissible || onDismiss !== undefined;

  return (
    <div
      data-slot="chip"
      className={cn(
        chipVariants({ variant: "tag" }),
        removable && "hover:bg-surface",
        selected && "border-blue-light bg-blue-lightest text-blue",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {dropdown ? <ChevronDown aria-hidden /> : null}
      {removable ? (
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
          className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export { Chip, chipVariants };
