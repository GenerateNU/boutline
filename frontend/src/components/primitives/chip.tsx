import { cn } from "cn";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";

type ChipProps = React.ComponentProps<"div"> & {
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
  dropdown?: boolean;
};

function Chip({
  className,
  icon,
  dismissible,
  onDismiss,
  dismissLabel = "Remove",
  dropdown,
  children,
  ...props
}: ChipProps) {
  return (
    <div
      data-slot="chip"
      className={cn(
        "inline-flex items-center gap-2 border border-foreground px-3 py-1.5 text-sm [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {dropdown ? <ExpandMoreOutlined aria-hidden /> : null}
      {dismissible || onDismiss ? (
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
          className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CloseOutlined aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export { Chip };
