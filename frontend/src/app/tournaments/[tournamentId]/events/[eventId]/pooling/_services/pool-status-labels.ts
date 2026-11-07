import type { PoolStatus } from "../_types/pool-board";

export const poolStatusLabels: Record<PoolStatus, string> = {
  upcoming: "Upcoming",
  active: "In Progress",
  ended: "Finished",
};
