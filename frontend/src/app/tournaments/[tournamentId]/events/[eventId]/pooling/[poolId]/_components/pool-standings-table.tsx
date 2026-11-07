import { useId } from "react";

import { poolStandings } from "../../_services/pool-standings";
import { poolTitle } from "../../_services/pool-title";
import type { PoolBoard } from "../../_types/pool-board";

const headerCell = "border-b border-neutral-400 pb-1 text-base font-medium";
const statColumns = ["V", "V/M", "TS", "TR", "Ind"];

interface PoolStandingsTableProps {
  pool: PoolBoard;
}

export function PoolStandingsTable({ pool }: PoolStandingsTableProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-xl font-medium">
        Standings
      </h2>
      <table className="w-full border-collapse">
        <caption className="sr-only">{`${poolTitle(pool)} standings`}</caption>
        <thead>
          <tr>
            <th scope="col" className={`${headerCell} text-left`}>
              Pl
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
        <tbody>
          {poolStandings(pool).map((row) => (
            <tr key={row.competitorId}>
              <td className="py-2 pr-3 text-left text-xl">{row.place}</td>
              <th scope="row" className="py-2 pr-3 text-left font-normal">
                <span className="block text-base font-medium">{row.name}</span>
                <span className="block text-xs">{row.team}</span>
              </th>
              <td className="py-2 text-center text-foreground">{row.victories}</td>
              <td className="py-2 text-center text-muted-foreground">{row.victoryRatio}</td>
              <td className="py-2 text-center text-muted-foreground">{row.touchesScored}</td>
              <td className="py-2 text-center text-muted-foreground">{row.touchesReceived}</td>
              <td className="py-2 text-center text-muted-foreground">{row.indicator}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
