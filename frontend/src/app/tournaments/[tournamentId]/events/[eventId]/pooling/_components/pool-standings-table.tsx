import { poolStandings } from "../_services/pool-standings";
import { poolTitle } from "../_services/pool-title";
import type { PoolBoard } from "../_types/pool-board";

const statColumns = ["V", "V/M", "TS", "TR", "Ind"];
const headerCell = "px-2 py-2 text-xs font-medium text-neutral-secondary";

export function PoolStandingsTable({ pool }: { pool: PoolBoard }) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-outline bg-card">
      <table className="w-full border-collapse">
        <caption className="sr-only">{`${poolTitle(pool)} standings`}</caption>
        <thead>
          <tr className="bg-blue-lightest">
            <th scope="col" className={`${headerCell} text-left`}>
              <span aria-hidden>#</span>
              <span className="sr-only">Place</span>
            </th>
            <th scope="col" className={`${headerCell} text-left`}>
              Fencer
            </th>
            {statColumns.map((label) => (
              <th key={label} scope="col" className={`${headerCell} text-center`}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline">
          {poolStandings(pool).map((row) => (
            <tr key={row.competitorId}>
              <td className="px-2 py-2 text-left text-sm font-medium text-blue">{row.place}</td>
              <th scope="row" className="w-full max-w-0 px-2 py-2 text-left font-normal">
                <span className="block truncate text-sm font-semibold uppercase">{row.name}</span>
                <span className="block truncate text-xs text-neutral-secondary uppercase">{row.team}</span>
              </th>
              <td className="px-2 py-2 text-center text-sm font-bold tabular-nums">{row.victories}</td>
              <td className="px-2 py-2 text-center text-sm tabular-nums">{row.victoryRatio}</td>
              <td className="px-2 py-2 text-center text-sm tabular-nums">{row.touchesScored}</td>
              <td className="px-2 py-2 text-center text-sm tabular-nums">{row.touchesReceived}</td>
              <td className="px-2 py-2 text-center text-sm tabular-nums">{row.indicator}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
