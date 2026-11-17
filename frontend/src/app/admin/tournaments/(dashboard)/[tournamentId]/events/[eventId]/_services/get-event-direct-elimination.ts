import { serverRequest } from "@/services/server-request";
import { DirectElimination, DirectEliminationListResult } from "@/types/direct-elimination";

// The newest direct elimination for the event, or null when it has none.
export async function getEventDirectElimination(
  eventId: string,
): Promise<DirectElimination | null> {
  const { data } = await serverRequest<DirectEliminationListResult>("/direct-eliminations", {
    params: { event_id: eventId, limit: 1 },
  });
  return data[0] ?? null;
}
