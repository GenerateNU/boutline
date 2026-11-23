import { serverRequest } from "@/services/server-request";
import type { PoolStageResultListResponse, PoolStageResultResponse } from "../_types/pool-stage-results-response";
import type { ResultFencer } from "../_types/results";

// The backend's maximum page size.
const RESULTS_FETCH_LIMIT = 100;

function ratingLabel(result: PoolStageResultResponse): string {
  if (result.rating === "U" || result.rating_year === null) {
    return result.rating;
  }
  return result.rating + String(result.rating_year).padStart(2, "0");
}

function toResultFencer(result: PoolStageResultResponse): ResultFencer {
  return {
    id: result.competitor_id,
    firstName: result.first_name,
    lastName: result.last_name,
    club: result.club ?? "",
    rating: ratingLabel(result),
    place: result.place,
    pool: result.pool_number,
    strip: result.strip,
    status: result.status,
  };
}

function getResultsPage(eventId: string, offset: number): Promise<PoolStageResultListResponse> {
  return serverRequest<PoolStageResultListResponse>(`/events/${encodeURIComponent(eventId)}/pool-stage-results`, {
    params: { limit: RESULTS_FETCH_LIMIT, offset },
  });
}

export async function getPoolStageResults(eventId: string): Promise<ResultFencer[]> {
  const first = await getResultsPage(eventId, 0);
  const offsets = [];
  for (let offset = RESULTS_FETCH_LIMIT; offset < first.total; offset += RESULTS_FETCH_LIMIT) {
    offsets.push(offset);
  }
  const rest = await Promise.all(offsets.map((offset) => getResultsPage(eventId, offset)));
  return [first, ...rest].flatMap((page) => page.data.map(toResultFencer));
}
