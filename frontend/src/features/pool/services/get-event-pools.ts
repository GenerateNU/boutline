import { serverRequest } from "@/services/server-request";
import { PoolBoard, PoolBoardList } from "@/features/pool/types/pool-board";

// The backend's maximum page size.
const POOL_FETCH_LIMIT = 100;

function getPoolPage(eventId: string, offset: number): Promise<PoolBoardList> {
  return serverRequest<PoolBoardList>("/pool-sheets", {
    params: { event_id: eventId, limit: POOL_FETCH_LIMIT, offset },
  });
}

export async function getEventPools(eventId: string): Promise<PoolBoard[]> {
  const first = await getPoolPage(eventId, 0);
  const offsets = [];
  for (let offset = POOL_FETCH_LIMIT; offset < first.total; offset += POOL_FETCH_LIMIT) {
    offsets.push(offset);
  }
  const rest = await Promise.all(offsets.map((offset) => getPoolPage(eventId, offset)));
  return [first, ...rest].flatMap((page) => page.data);
}
