import { cn } from "cn";

import type { PoolTableData, PoolView } from "../_types/pool-table";

interface PoolTableProps {
  caption: string;
  view: PoolView;
  data: PoolTableData;
}

export function PoolTable({ caption, view, data }: PoolTableProps) {
  const lastColumn = data.headers.length - 1;
  const lastRow = data.rows.length - 1;

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
                <div className="w-12 py-3 text-center">{header}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, rowIndex) => (
            <tr key={row.name}>
              <th scope="row" className="max-w-0 pr-2 text-left font-normal">
                <span className="block truncate text-base">{row.name}</span>
                <span className="block truncate text-xs font-light">{row.team}</span>
              </th>
              {row.cells.map((cell, column) => (
                <td
                  key={data.headers[column]}
                  className={cn(
                    "border-r border-b border-neutral-600 p-0",
                    cell.kind === "self" ? "bg-foreground" : view === "bouts" ? "bg-neutral-300" : "bg-background",
                    column === 0 && "border-l",
                    rowIndex === lastRow && column === 0 && "rounded-bl-md",
                    rowIndex === lastRow && column === lastColumn && "rounded-br-md",
                  )}
                >
                  {/* A fixed box, because the name column's w-full would otherwise squeeze the grid columns. */}
                  <div className="flex size-12 items-center justify-center">
                    {cell.kind === "value" ? cell.label : null}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
