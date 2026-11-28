import type { PoolStatus } from "@/features/pool/types/pool-board";

export const poolStatusLabels: Record<PoolStatus, string> = {
  upcoming: "Upcoming",
  active: "In Progress",
  ended: "Completed",
};
