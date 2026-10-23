import { poolStatusLabels } from "../_services/pool-status-labels";
import type { PoolStatus } from "../_types/pool-board";

interface PoolStatusBadgeProps {
  status: PoolStatus;
}

export function PoolStatusBadge({ status }: PoolStatusBadgeProps) {
  return (
    <span className="rounded-sm bg-primary px-1.5 py-1 text-xs whitespace-nowrap text-primary-foreground">
      {poolStatusLabels[status]}
    </span>
  );
}
