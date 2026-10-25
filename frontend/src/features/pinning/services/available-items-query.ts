import { apiRequest } from "@/services/api-request";
import { ListResponse } from "@/types/list-response";
import { Competitor } from "@/types/competitor";
import { Bout } from "@/types/bout";

interface AvailableItems {
  fencers: Competitor[];
  bouts: Bout[];
}

// TEMPORARY: dropdown options for the /pinned scaffold page only. Not a
// general-purpose fencer/bout listing service — delete alongside that page.
const AVAILABLE_ITEMS_LIMIT = 100;

async function fetchAvailableItems(): Promise<AvailableItems> {
  const [competitors, bouts] = await Promise.all([
    apiRequest<ListResponse<Competitor>>(`/competitors?limit=${AVAILABLE_ITEMS_LIMIT}`),
    apiRequest<ListResponse<Bout>>(`/bouts?limit=${AVAILABLE_ITEMS_LIMIT}`),
  ]);
  return { fencers: competitors.data, bouts: bouts.data };
}

export { fetchAvailableItems };
