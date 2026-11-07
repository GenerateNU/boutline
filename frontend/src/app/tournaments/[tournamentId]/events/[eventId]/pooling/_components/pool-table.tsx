import { cn } from "cn";

import type { PoolTableCell, PoolTableData } from "../_types/pool-table";

interface PoolTableProps {
  caption: string;
  data: PoolTableData;
  selectedBoutId?: string | null;
  onSelectBout?: (boutId: string) => void;
}

// Larger pools shrink the grid columns so eight fencers still fit a phone beside the name column.
// The name shrinks with them, since the two-line name cell would otherwise set a taller row.
function cellSizing(columns: number): { width: string; box: string; name: string } {
  if (columns <= 5) {
    return { width: "w-12", box: "size-12", name: "text-base" };
  }
  return columns <= 7
    ? { width: "w-10", box: "size-10", name: "text-sm" }
    : { width: "w-8", box: "size-8", name: "text-xs" };
}

function cellBackground(cell: PoolTableCell, selected: boolean): string {
  if (cell.kind === "self") {
    return "bg-foreground";
  }
  if (selected) {
    return "bg-selected text-selected-foreground";
  }
  return cell.kind === "bout" ? "bg-neutral-300" : "bg-background";
}

export function PoolTable({ caption, data, selectedBoutId = null, onSelectBout }: PoolTableProps) {
  const lastColumn = data.headers.length - 1;
  const lastRow = data.rows.length - 1;
  const sizing = cellSizing(data.headers.length);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-full">
              <span className="sr-only">Fencer</span>
            </th>
            {data.headers.map((header, column) => (
              <th
                key={header}
                scope="col"
                className={cn(
                  "border-t border-r border-b border-neutral-600 bg-neutral-400 p-0 font-semibold",
                  column === 0 && "rounded-tl-md border-l",
                  column === lastColumn && "rounded-tr-md",
                )}
              >
                <div className={cn("py-3 text-center", sizing.width)}>{header}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, rowIndex) => (
            <tr key={row.name}>
              <th scope="row" className="max-w-0 pr-2 text-left font-normal">
                <span className={cn("block truncate", sizing.name)}>{row.name}</span>
                <span className="block truncate text-xs font-light">{row.team}</span>
              </th>
              {row.cells.map((cell, column) => {
                const boutId = cell.kind === "bout" ? cell.boutId : null;
                const selected = boutId !== null && boutId === selectedBoutId;
                // A fixed box, because the name column's w-full would otherwise squeeze the grid columns.
                const boxClass = cn("flex items-center justify-center", sizing.box);

                return (
                  <td
                    key={data.headers[column]}
                    className={cn(
                      "border-r border-b border-neutral-600 p-0",
                      cellBackground(cell, selected),
                      column === 0 && "border-l",
                      rowIndex === lastRow && column === 0 && "rounded-bl-md",
                      rowIndex === lastRow && column === lastColumn && "rounded-br-md",
                    )}
                  >
                    {onSelectBout && boutId !== null ? (
                      <button
                        type="button"
                        aria-pressed={selected}
                        // The bouts table is square, so column i is row i's fencer.
                        aria-label={`${row.name} vs ${data.rows[column].name}`}
                        onClick={() => onSelectBout(boutId)}
                        className={cn(boxClass, "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring")}
                      >
                        {cell.kind === "bout" ? cell.label : null}
                      </button>
                    ) : (
                      <div className={boxClass}>{cell.kind === "self" ? null : cell.label}</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
