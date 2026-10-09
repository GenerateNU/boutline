import { cn } from "cn";
import { ChevronDown, X } from "lucide-react";

type ChipProps = React.ComponentProps<"span"> & {
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  dropdown?: boolean;
};

function Chip({
  className,
  icon,
  dismissible,
  onDismiss,
  dropdown,
  children,
  ...props
}: ChipProps) {
  return (
    <span
      data-slot="chip"
      className={cn(
        "inline-flex items-center gap-2 border border-foreground px-3 py-1.5 text-sm [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {dropdown ? <ChevronDown aria-hidden /> : null}
      {dismissible || onDismiss ? (
        <button
          type="button"
          aria-label="Remove"
          onClick={onDismiss}
          className="outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden />
        </button>
      ) : null}
    </span>
  );
}

export { Chip };
