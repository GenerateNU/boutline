import { serverRequest } from "@/services/server-request";
import type { ListResponse } from "@/types/list-response";

import type { EventResult } from "../_types/event-result";

// The backend's maximum page size.
const RESULT_FETCH_LIMIT = 100;

function getResultPage(eventId: string, offset: number) {
  return serverRequest<ListResponse<EventResult>>(
    `/events/${encodeURIComponent(eventId)}/results`,
    { params: { limit: RESULT_FETCH_LIMIT, offset } },
  );
}

export async function getEventResults(eventId: string) {
  const first = await getResultPage(eventId, 0);
  const offsets = [];
  for (
    let offset = RESULT_FETCH_LIMIT;
    offset < first.total;
    offset += RESULT_FETCH_LIMIT
  ) {
    offsets.push(offset);
  }
  const rest = await Promise.all(
    offsets.map((offset) => getResultPage(eventId, offset)),
  );
  return [first, ...rest].flatMap((page) => page.data);
}
