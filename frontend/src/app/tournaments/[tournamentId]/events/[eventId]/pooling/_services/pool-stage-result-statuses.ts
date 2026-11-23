import type { PoolStageResultStatus } from "../_types/pool-stage-result";

// In legend order.
export const POOL_STAGE_RESULT_STATUSES: Record<PoolStageResultStatus, { label: string; dotClass: string }> = {
  advanced: { label: "Advanced", dotClass: "bg-accent-green" },
  eliminated: { label: "Eliminated", dotClass: "bg-amber" },
  pending: { label: "Pending", dotClass: "bg-neutral-muted" },
};
