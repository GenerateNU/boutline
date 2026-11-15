export const STAT_COLUMNS = ["V", "V/M", "TS", "TR", "Ind"];

const HEADER_CELL = "px-2 py-2 text-xs font-medium text-neutral-secondary";

export function PoolStandingsHead() {
  return (
    <thead>
      <tr className="bg-blue-lightest">
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
  );
}
