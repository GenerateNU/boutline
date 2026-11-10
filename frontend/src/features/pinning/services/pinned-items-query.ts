import { apiRequest } from "@/services/api-request";
import { PINNED_MAX_IDS, PinnedIds, PinnedItems } from "@/features/pinning/types/pinning";
import { ListResponse } from "@/types/list-response";
import { Competitor } from "@/types/competitor";

// The backend rejects more than PINNED_MAX_IDS ids per request.
async function fetchByIds<T>(path: string, ids: string[]): Promise<T[]> {
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += PINNED_MAX_IDS) {
    batches.push(ids.slice(i, i + PINNED_MAX_IDS));
  }
  const pages = await Promise.all(
    batches.map((batch) => {
      const params = new URLSearchParams({ ids: batch.join(","), limit: String(batch.length) });
      return apiRequest<ListResponse<T>>(`${path}?${params.toString()}`);
    }),
  );
  return pages.flatMap((page) => page.data);
}

function fencerName({ firstName, lastName }: Competitor) {
  return `${firstName} ${lastName}`;
}

async function fetchPinnedItems(pinned: PinnedIds): Promise<PinnedItems> {
  const fencers = await fetchByIds<Competitor>("/competitors", pinned.fencerIds);
  return {
    fencers: [...fencers].sort((a, b) =>
      fencerName(a).localeCompare(fencerName(b), undefined, { sensitivity: "base" }),
    ),
  };
}

export { fetchPinnedItems };
