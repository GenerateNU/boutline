import type { PoolStageResult, PoolStageResultFilters } from "../_types/pool-stage-result";

export const NO_POOL_STAGE_RESULT_FILTERS: PoolStageResultFilters = { status: null, poolNumber: null };

export function filterPoolStageResults(
  results: PoolStageResult[],
  search: string,
  { status, poolNumber }: PoolStageResultFilters,
): PoolStageResult[] {
  const query = search.trim().toLowerCase();
  return results.filter(
    (result) =>
      (status === null || result.status === status) &&
      (poolNumber === null || result.pool_number === poolNumber) &&
      [`${result.first_name} ${result.last_name}`, result.club ?? ""].some((text) =>
        text.toLowerCase().includes(query),
      ),
  );
}
