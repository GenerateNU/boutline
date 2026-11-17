import { cn } from "cn";

import type { PoolTableCell, PoolTableData } from "@/features/pool/types/pool-table";

interface PoolTableProps {
  caption: string;
  data: PoolTableData;
  selectedBoutId?: string | null;
  onSelectBout?: (boutId: string) => void;
}

// Up to this many fencers the grid stretches to fit a phone; past it the cells keep a fixed size and the
// grid scrolls sideways, with the name column pinned so each row stays readable.
const MAX_FITTING_FENCERS = 6;

function cellColor(cell: PoolTableCell): string {
  if (cell.kind === "self") {
    return "bg-obsidian";
  }
  if (cell.result === "V") {
    return "bg-green-light text-green-dark";
  }
  return cell.result === "D" ? "bg-red-light text-red-dark" : "bg-surface";
}

export function PoolTable({ caption, data, selectedBoutId = null, onSelectBout }: PoolTableProps) {
  const scrolls = data.headers.length > MAX_FITTING_FENCERS;
  const nameCell = cn("pr-1 text-left font-normal", scrolls && "sticky left-0 z-10 bg-card");

  const table = (
    <table className={cn("border-separate border-spacing-1", scrolls ? "w-max" : "w-full table-fixed")}>
      <caption className="sr-only">{caption}</caption>
      <colgroup>
        <col className="w-26" />
        {data.headers.map((header) => (
          <col key={header} className={cn(scrolls && "w-10")} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th scope="col" className={nameCell}>
            <span className="sr-only">Fencer</span>
          </th>
          {data.headers.map((header) => (
            <th key={header} scope="col" className="p-0">
              <div className="flex h-6 items-center justify-center rounded-[4px] bg-blue text-xs text-white">
                {header}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((row) => (
          <tr key={row.name}>
            <th scope="row" className={nameCell}>
              <span className="block w-25 truncate text-sm uppercase">{row.name}</span>
              <span className="block w-25 truncate text-xs text-neutral-secondary">{row.team}</span>
            </th>
            {row.cells.map((cell, column) => {
              const boutId = cell.kind === "bout" ? cell.boutId : null;
              const selected = boutId !== null && boutId === selectedBoutId;
              const boxClass = cn(
                "flex h-9 items-center justify-center rounded-[4px] text-sm",
                scrolls ? "w-10" : "w-full",
                cellColor(cell),
              );

              return (
                <td key={data.headers[column]} className="p-0">
                  {onSelectBout && boutId !== null ? (
                    <button
                      type="button"
                      aria-pressed={selected}
                      // The bouts table is square, so column i is row i's fencer.
                      aria-label={`${row.name} vs ${data.rows[column].name}`}
                      onClick={() => onSelectBout(boutId)}
                      className={cn(
                        boxClass,
                        "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                        selected && "ring-2 ring-blue ring-inset",
                      )}
                    >
                      {cell.kind === "bout" ? cell.label : null}
                    </button>
                  ) : (
                    <div className={boxClass}>{cell.kind === "bout" ? cell.label : null}</div>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  // A scrollable region needs to be focusable so keyboard users can scroll it.
  return scrolls ? (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className="overflow-x-auto rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {table}
    </div>
  ) : (
    table
  );
}
