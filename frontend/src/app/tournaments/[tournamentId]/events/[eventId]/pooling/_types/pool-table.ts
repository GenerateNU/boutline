export type PoolView = "bouts" | "standings";
export type PoolTableCell =
  | { kind: "self" }
  | { kind: "bout"; label: string; result: "V" | "D" | null; boutId: string | null };
export interface PoolTableRow {
  name: string;
  team: string;
  cells: PoolTableCell[];
}
export interface PoolTableData {
  headers: string[];
  rows: PoolTableRow[];
}
