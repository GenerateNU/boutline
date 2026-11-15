import { serverRequest } from "@/services/server-request";
import { PoolStage, PoolStageListResult } from "@/types/pool-stage";

// The newest stage for the event, or null when it has none.
export async function getEventPoolStage(eventId: string): Promise<PoolStage | null> {
  const query = new URLSearchParams({ event_id: eventId, limit: "1" });
  const { data } = await serverRequest<PoolStageListResult>(`/pool-stages?${query}`);
  return data[0] ?? null;
}
