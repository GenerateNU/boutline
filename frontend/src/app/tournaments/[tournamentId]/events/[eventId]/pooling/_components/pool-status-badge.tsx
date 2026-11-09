import { StatusBadge, type Status } from "@/components/primitives/status-badge";

import type { PoolStatus } from "../_types/pool-board";

const badgeStatus: Record<PoolStatus, Status> = {
  upcoming: "upcoming",
  active: "in-progress",
  ended: "completed",
};

export function PoolStatusBadge({ status }: { status: PoolStatus }) {
  return <StatusBadge status={badgeStatus[status]} />;
}
