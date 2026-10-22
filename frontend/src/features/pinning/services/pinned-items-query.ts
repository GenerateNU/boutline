import { apiRequest } from "@/services/api-request";
import { PinnedIds } from "@/features/pinning/types/pinning";
import { Competitor } from "@/types/competitor";
import { Bout } from "@/types/bout";

interface PinnedItems {
  fencers: Competitor[];
  matches: Bout[];
}

interface ListResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

function fetchByIds<T>(path: string, ids: string[]): Promise<T[]> {
  if (ids.length === 0) {
    return Promise.resolve([]);
  }
  const params = new URLSearchParams({ ids: ids.join(","), limit: String(ids.length) });
  return apiRequest<ListResponse<T>>(`${path}?${params.toString()}`).then((response) => response.data);
}

async function fetchPinnedItems(pinned: PinnedIds): Promise<PinnedItems> {
  const [fencers, matches] = await Promise.all([
    fetchByIds<Competitor>("/competitors", pinned.fencerIds),
    fetchByIds<Bout>("/bouts", pinned.matchIds),
  ]);
  return { fencers, matches };
}

export { fetchPinnedItems };
