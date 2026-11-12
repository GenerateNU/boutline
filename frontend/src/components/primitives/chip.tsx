import { cn } from "cn";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";

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
        "inline-flex items-center gap-1 rounded-md border border-outline bg-background px-2.5 py-1.5 text-xs font-medium text-obsidian [&_svg]:size-3.5 [&_svg]:shrink-0",
        {
          "hover:bg-surface": removable,
          "border-blue-light bg-blue-lightest text-blue": selected,
        },
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
