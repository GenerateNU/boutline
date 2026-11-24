import { POOL_STAGE_RESULT_STATUSES } from "../_services/pool-stage-result-statuses";
import type { PoolStageResult, PoolStageResultStatus } from "../_types/pool-stage-result";

import { PoolStageResultDot } from "./pool-stage-result-dot";

const HEADER_CELL = "px-2 py-2 text-xs font-medium text-neutral-secondary";
const STAT_CELL = "px-2 py-3 text-center text-sm tabular-nums";
const STAT_COLUMNS = ["Status", "V", "V/M", "TS"];
const STATUSES = Object.keys(POOL_STAGE_RESULT_STATUSES) as PoolStageResultStatus[];

export function PoolStageResultsTable({ results }: { results: PoolStageResult[] }) {
  const legend = STATUSES.filter((status) => results.some((result) => result.status === status));

  return (
    <div className="overflow-hidden rounded-[12px] border border-outline bg-card">
      <ul aria-label="Status legend" className="flex gap-4 bg-blue-lightest px-3 py-2">
        {legend.map((status) => (
          <li key={status} className="flex items-center gap-1.5 text-xs text-neutral-secondary">
            <PoolStageResultDot status={status} />
            {POOL_STAGE_RESULT_STATUSES[status].label}
          </li>
        ))}
      </ul>
      <table className="w-full border-collapse">
        <caption className="sr-only">Pool results</caption>
        <thead>
          <tr className="border-y border-outline">
            <th scope="col" className={`${HEADER_CELL} text-left`}>
              <span aria-hidden>#</span>
              <span className="sr-only">Place</span>
            </th>
            <th scope="col" className={`${HEADER_CELL} text-left`}>
              Fencer
            </th>
            {STAT_COLUMNS.map((label) => (
              <th key={label} scope="col" className={`${HEADER_CELL} text-center`}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline">
          {results.map((result) => (
            <tr key={result.competitor_id} className="even:bg-surface">
              <td className="px-2 py-3 text-left text-sm font-medium text-blue tabular-nums">{result.place}</td>
              <th scope="row" className="w-full max-w-0 px-2 py-3 text-left font-normal">
                <span className="block truncate text-sm font-semibold uppercase">
                  {result.first_name} {result.last_name}
                </span>
                {result.club && (
                  <span className="block truncate text-xs text-neutral-secondary uppercase">{result.club}</span>
                )}
              </th>
              <td className="px-2 py-3">
                <span className="flex justify-center">
                  <PoolStageResultDot status={result.status} />
                  <span className="sr-only">{POOL_STAGE_RESULT_STATUSES[result.status].label}</span>
                </span>
              </td>
              <td className={`${STAT_CELL} font-bold`}>{result.victories}</td>
              <td className={STAT_CELL}>{result.victory_ratio.toFixed(2)}</td>
              <td className={STAT_CELL}>{result.touches_scored}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
