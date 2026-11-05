import { cva } from "class-variance-authority";
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

const statusLabels: Record<Status, string> = {
  "in-progress": "In Progress",
  upcoming: "Upcoming",
  completed: "Completed",
  "not-started": "Not Started",
  live: "Live",
  scheduled: "Scheduled",
  occupied: "Occupied",
  available: "Available",
};

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full py-0.75 pr-2.5 pl-2 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      status: {
        "in-progress": "bg-status-amber text-status-amber-foreground",
        upcoming: "bg-status-lavender text-status-lavender-foreground",
        completed: "bg-status-green text-status-green-foreground",
        "not-started": "bg-surface text-neutral-secondary",
        live: "bg-status-mint text-status-mint-foreground before:size-1.5 before:rounded-full before:bg-accent-green",
        scheduled: "bg-blue-lightest text-blue",
        occupied: "bg-status-red text-status-red-foreground",
        available: "bg-status-green text-status-green-foreground",
      },
    },
  },
);

interface StatusBadgeProps extends React.ComponentProps<"div"> {
  status: Status;
}

function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  return (
    <div
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ status, className }))}
      {...props}
    >
      {statusLabels[status]}
    </div>
  );
}

export { StatusBadge, type Status };
