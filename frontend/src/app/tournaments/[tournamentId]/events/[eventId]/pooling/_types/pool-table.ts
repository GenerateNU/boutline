export type PoolView = "bouts" | "standings";
export type PoolTableCell =
  | { kind: "self" }
  | { kind: "value"; label: string }
  | { kind: "bout"; label: string; boutId: string | null };
export interface PoolTableRow {
  name: string;
  team: string;
  cells: PoolTableCell[];
}
export interface PoolTableData {
  headers: string[];
  rows: PoolTableRow[];
}
