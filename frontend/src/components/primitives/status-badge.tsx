import { cn } from "cn";

type Status =
  | "in-progress"
  | "upcoming"
  | "completed"
  | "not-started"
  | "live"
  | "scheduled"
  | "occupied"
  | "available";

const statuses: Record<Status, { label: string; className: string }> = {
  "in-progress": {
    label: "In Progress",
    className: "bg-status-amber text-status-amber-foreground",
  },
  upcoming: {
    label: "Upcoming",
    className: "bg-status-lavender text-status-lavender-foreground",
  },
  completed: {
    label: "Completed",
    className: "bg-status-green text-status-green-foreground",
  },
  "not-started": {
    label: "Not Started",
    className: "bg-surface text-neutral-secondary",
  },
  live: {
    label: "Live",
    className:
      "bg-status-mint text-status-mint-foreground before:size-1.5 before:rounded-full before:bg-accent-green",
  },
  scheduled: { label: "Scheduled", className: "bg-blue-lightest text-blue" },
  occupied: {
    label: "Occupied",
    className: "bg-status-red text-status-red-foreground",
  },
  available: {
    label: "Available",
    className: "bg-status-green text-status-green-foreground",
  },
};

interface StatusBadgeProps extends React.ComponentProps<"div"> {
  status: Status;
}

function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  return (
    <div
      data-slot="status-badge"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full py-0.75 pr-2.5 pl-2 text-xs font-medium whitespace-nowrap",
        statuses[status].className,
        className,
      )}
      {...props}
    >
      {statuses[status].label}
    </div>
  );
}

export { StatusBadge, type Status };
