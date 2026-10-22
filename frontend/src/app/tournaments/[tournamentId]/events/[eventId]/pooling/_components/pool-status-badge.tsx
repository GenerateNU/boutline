import type { PoolStatus } from "../_types/pool-board";

const statusLabels: Record<PoolStatus, string> = {
  upcoming: "Upcoming",
  active: "In Progress",
  ended: "Finished",
};

interface PoolStatusBadgeProps {
  status: PoolStatus;
}

export function PoolStatusBadge({ status }: PoolStatusBadgeProps) {
  return (
    <span className="rounded-sm bg-primary px-1.5 py-1 text-xs whitespace-nowrap text-primary-foreground">
      {statusLabels[status]}
    </span>
  );
}
