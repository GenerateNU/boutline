import { TournamentEvent } from "@/features/event/types/event";
import { ApiError } from "@/services/api-request";
import { serverRequest } from "@/services/server-request";

// The backend answers 404 for an unknown event and 422 for an id that isn't a UUID; both mean "no such event".
const NOT_FOUND_STATUSES = [404, 422];

export async function getEvent(id: string): Promise<TournamentEvent | null> {
  try {
    return await serverRequest<TournamentEvent>(`/events/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err instanceof ApiError && NOT_FOUND_STATUSES.includes(err.status)) {
      return null;
    }
    throw err;
  }
}
