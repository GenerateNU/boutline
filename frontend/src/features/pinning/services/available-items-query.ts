// TEMPORARY: used to make a dropdown of all pinnable UUIDs on the dummy pinning page
// Actual pinning will be done through other interfaces with UUIDs obtained through
// other GET requests, so this entiry file should be deletable.

import { apiRequest } from "@/services/api-request";
import { ListResponse } from "@/types/list-response";
import { Competitor } from "@/types/competitor";
import { Bout } from "@/types/bout";

interface AvailableItems {
  fencers: Competitor[];
  bouts: Bout[];
}

const AVAILABLE_ITEMS_LIMIT = 100;

async function fetchAvailableItems(): Promise<AvailableItems> {
  const [competitors, bouts] = await Promise.all([
    apiRequest<ListResponse<Competitor>>(`/competitors?limit=${AVAILABLE_ITEMS_LIMIT}`),
    apiRequest<ListResponse<Bout>>(`/bouts?limit=${AVAILABLE_ITEMS_LIMIT}`),
  ]);
  return { fencers: competitors.data, bouts: bouts.data };
}

export { fetchAvailableItems };
