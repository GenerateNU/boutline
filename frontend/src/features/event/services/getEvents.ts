import { EventListResult, TournamentEvent } from "@/features/event/types/event";
import { serverRequest } from "@/services/server-request";

// The backend's maximum page size.
const EVENT_FETCH_LIMIT = 100;

function getEventPage(tournamentId: string, offset: number): Promise<EventListResult> {
  return serverRequest<EventListResult>("/events", {
    params: { tournament_id: tournamentId, limit: EVENT_FETCH_LIMIT, offset },
  });
}

// Every event in the tournament. The backend orders pages by creation time,
// not start time, so callers need all pages to build a day-by-day schedule.
export async function getEvents(tournamentId: string): Promise<TournamentEvent[]> {
  const first = await getEventPage(tournamentId, 0);
  const offsets = [];
  for (let offset = EVENT_FETCH_LIMIT; offset < first.total; offset += EVENT_FETCH_LIMIT) {
    offsets.push(offset);
  }
  const rest = await Promise.all(offsets.map((offset) => getEventPage(tournamentId, offset)));
  return [first, ...rest].flatMap((page) => page.data);
}
