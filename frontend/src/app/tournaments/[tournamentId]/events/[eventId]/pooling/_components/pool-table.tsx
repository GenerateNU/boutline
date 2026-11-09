import { cn } from "cn";

import type { PoolTableCell, PoolTableData } from "../_types/pool-table";

interface PoolTableProps {
  caption: string;
  data: PoolTableData;
  selectedBoutId?: string | null;
  onSelectBout?: (boutId: string) => void;
}

// Eight or more fencers get a narrower name column and shorter rows so the grid still fits a phone.
function sizing(columns: number): { nameWidth: string; height: string; name: string } {
  return columns <= 7
    ? { nameWidth: "w-26", height: "h-9", name: "text-sm" }
    : { nameWidth: "w-20", height: "h-8", name: "text-xs" };
}

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
  const size = sizing(data.headers.length);

  return (
    <table className="w-full table-fixed border-separate border-spacing-1">
      <caption className="sr-only">{caption}</caption>
      <colgroup>
        <col className={size.nameWidth} />
        {data.headers.map((header) => (
          <col key={header} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th scope="col">
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
            <th scope="row" className="pr-1 text-left font-normal">
              <span className={cn("block truncate uppercase", size.name)}>{row.name}</span>
              <span className="block truncate text-xs text-neutral-secondary">{row.team}</span>
            </th>
            {row.cells.map((cell, column) => {
              const boutId = cell.kind === "bout" ? cell.boutId : null;
              const selected = boutId !== null && boutId === selectedBoutId;
              const boxClass = cn(
                "flex w-full items-center justify-center rounded-[4px] text-sm",
                size.height,
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
}
