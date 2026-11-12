import { apiRequest } from "@/services/api-request";
import { ListResponse } from "@/types/list-response";
import { Competitor } from "@/types/competitor";

function fencerName({ firstName, lastName }: Competitor) {
  return `${firstName} ${lastName}`;
}

// One request is enough: usePinnedItems caps pins at PINNED_MAX_IDS, the most
// ids the backend accepts.
async function fetchPinnedFencers(ids: string[]): Promise<Competitor[]> {
  if (ids.length === 0) {
    return [];
  }
  const params = new URLSearchParams({ ids: ids.join(","), limit: String(ids.length) });
  const { data } = await apiRequest<ListResponse<Competitor>>(`/competitors?${params}`);
  return data.sort((a, b) => fencerName(a).localeCompare(fencerName(b), undefined, { sensitivity: "base" }));
}

export { fetchPinnedFencers };
