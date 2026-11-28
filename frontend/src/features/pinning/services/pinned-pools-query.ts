import type { PoolBoard, PoolBoardList } from "@/features/pool/types/pool-board";
import { apiRequest } from "@/services/api-request";

// The backend caps ids at 100, the same cap as the pin limit.
async function fetchPinnedPools(ids: string[]): Promise<PoolBoard[]> {
  if (ids.length === 0) {
    return [];
  }
  const params = new URLSearchParams({ ids: ids.join(","), limit: String(ids.length) });
  const { data } = await apiRequest<PoolBoardList>(`/pool-sheets?${params}`);
  return data;
}

export { fetchPinnedPools };
