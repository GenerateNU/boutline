import type { TournamentEvent } from "@/features/event/types/event";
import { serverRequest } from "@/services/server-request";
import type { ListResponse } from "@/types/list-response";

// The backend's maximum page size; no event has anywhere near this many pools.
const POOL_LIMIT = 100;

interface PoolSheet {
  id: string;
  number: number;
  status: "upcoming" | "active" | "ended";
}

// A pool as the Referees tab offers it: labelled for its dropdowns and chips.
export interface PoolOption {
  id: string;
  // Pool numbers repeat across events, so each label names its event: "Pool 1 · Y14 Foil".
  label: string;
  // A pool that has started can't change referee, so Add Referees offers only upcoming ones.
  upcoming: boolean;
}

async function getEventPools({ id, name }: TournamentEvent): Promise<PoolOption[]> {
  const { data } = await serverRequest<ListResponse<PoolSheet>>("/pool-sheets", {
    params: { event_id: id, limit: POOL_LIMIT },
  });
  return data.map((pool) => ({
    id: pool.id,
    label: `Pool ${pool.number} · ${name}`,
    upcoming: pool.status === "upcoming",
  }));
}

// Every event's pools as one list, one request per event.
export async function getTournamentPools(events: TournamentEvent[]): Promise<PoolOption[]> {
  const poolsByEvent = await Promise.all(events.map(getEventPools));
  return poolsByEvent.flat();
}
