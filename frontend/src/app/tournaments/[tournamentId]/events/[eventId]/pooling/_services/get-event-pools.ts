import { serverRequest } from "@/services/server-request";
import { PoolBoard, PoolBoardList } from "../_types/pool-board";

import { getAllPages, PAGE_LIMIT } from "./get-all-pages";

export function getEventPools(eventId: string): Promise<PoolBoard[]> {
  return getAllPages((offset) =>
    serverRequest<PoolBoardList>("/pool-sheets", {
      params: { event_id: eventId, limit: PAGE_LIMIT, offset },
    }),
  );
}
