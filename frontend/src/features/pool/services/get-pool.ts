import { ApiError } from "@/services/api-request";
import { serverRequest } from "@/services/server-request";
import { PoolBoard } from "@/features/pool/types/pool-board";

// The backend answers 404 for an unknown pool and 422 for an id that isn't a UUID; both mean "no such pool".
const NOT_FOUND_STATUSES = [404, 422];

export async function getPool(poolId: string): Promise<PoolBoard | null> {
  try {
    return await serverRequest<PoolBoard>(`/pool-sheets/${encodeURIComponent(poolId)}`);
  } catch (err) {
    if (err instanceof ApiError && NOT_FOUND_STATUSES.includes(err.status)) {
      return null;
    }
    throw err;
  }
}
