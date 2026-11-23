import { serverRequest } from "@/services/server-request";
import type { PoolStageResult, PoolStageResultList } from "../_types/pool-stage-result";

import { getAllPages, PAGE_LIMIT } from "./get-all-pages";

export function getPoolStageResults(eventId: string): Promise<PoolStageResult[]> {
  return getAllPages((offset) =>
    serverRequest<PoolStageResultList>(`/events/${eventId}/pool-stage-results`, {
      params: { limit: PAGE_LIMIT, offset },
    }),
  );
}
