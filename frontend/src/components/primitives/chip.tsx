import { cn } from "cn";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";

interface ChipProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
  dropdown?: boolean;
}

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
  const removable = dismissible || onDismiss !== undefined;

  return (
    <div
      data-slot="chip"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-blue-light bg-blue-lightest py-1 pr-2.5 pl-2 text-xs font-medium text-blue shadow-sm [&_svg]:size-4 [&_svg]:shrink-0",
        { "hover:bg-blue-lighter": removable },
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {dropdown ? <ExpandMoreOutlined aria-hidden /> : null}
      {removable ? (
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
