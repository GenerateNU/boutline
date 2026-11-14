import { PoolTableCell, PoolTableData } from "@/features/pool/types/pool-table";

const SELF: PoolTableCell = { kind: "self" };

function bout(result: "V" | "D", touches: number): PoolTableCell {
  return { kind: "bout", label: `${result}${touches}`, result, boutId: null };
}

export const SAMPLE_POOL: PoolTableData = {
  headers: ["1", "2", "3", "4"],
  rows: [
    { name: "Yan Wang", team: "NFC", cells: [SELF, bout("D", 4), bout("V", 5), bout("D", 1)] },
    { name: "Caitlin Lee", team: "NFC", cells: [bout("V", 5), SELF, bout("D", 4), bout("V", 5)] },
    { name: "Claire Min", team: "BFC", cells: [bout("D", 1), bout("V", 5), SELF, bout("D", 4)] },
    { name: "Traci Lu", team: "NE", cells: [bout("V", 5), bout("D", 1), bout("V", 5), SELF] },
  ],
};
