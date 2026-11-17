import { serverRequest } from "@/services/server-request";

// The tableau has no rounds until it is drawn.
export async function getTableauDrawn(eventId: string): Promise<boolean> {
  const { rounds } = await serverRequest<{ rounds: unknown[] }>(
    `/events/${encodeURIComponent(eventId)}/tableau`,
  );
  return rounds.length > 0;
}
