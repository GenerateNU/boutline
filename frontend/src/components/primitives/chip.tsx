import { cn } from "cn";
import { ChevronDown, X } from "lucide-react";

interface ChipProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  dropdown?: boolean;
  selected?: boolean;
}

function Chip({
  className,
  icon,
  dismissible,
  onDismiss,
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
        "inline-flex items-center gap-1 rounded-md border border-outline bg-background px-2.5 py-1.5 text-xs font-medium text-obsidian [&_svg]:size-3.5 [&_svg]:shrink-0",
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
          aria-label="Remove"
          onClick={onDismiss}
          className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export { Chip };
