import { cn } from "cn";

import { POOL_STAGE_RESULT_STATUSES } from "../_services/pool-stage-result-statuses";
import type { PoolStageResultStatus } from "../_types/pool-stage-result";

export function PoolStageResultDot({ status }: { status: PoolStageResultStatus }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-3 shrink-0 rounded-full", POOL_STAGE_RESULT_STATUSES[status].dotClass)}
    />
  );
}
