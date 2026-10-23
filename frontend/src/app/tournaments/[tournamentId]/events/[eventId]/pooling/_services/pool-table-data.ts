import { PoolBoard, PoolFencer } from "../_types/pool-board";
import { PoolTableCell, PoolTableData } from "../_types/pool-table";

import { fencerName } from "./fencer-name";

// Rows follow `position` because that is the pool sheet order the column numbers refer to.
function byPosition(pool: PoolBoard): PoolFencer[] {
  return [...pool.fencers].sort((a, b) => a.position - b.position);
}

function boutCell(pool: PoolBoard, row: PoolFencer, column: PoolFencer): PoolTableCell {
  const bout = pool.bouts.find(
    (b) =>
      [b.competitor_1_id, b.competitor_2_id].includes(row.competitor_id) &&
      [b.competitor_1_id, b.competitor_2_id].includes(column.competitor_id),
  );
  // A bout can be won on priority, so a decided bout is detected by its winner rather than its status.
  if (!bout || bout.winner_id === null) {
    return { kind: "bout", label: "", boutId: bout?.id ?? null };
  }
  const score = bout.competitor_1_id === row.competitor_id ? bout.competitor_1_score : bout.competitor_2_score;
  return { kind: "bout", label: `${bout.winner_id === row.competitor_id ? "V" : "D"}${score}`, boutId: bout.id };
}

export function boutsTable(pool: PoolBoard): PoolTableData {
  const fencers = byPosition(pool);
  return {
    headers: fencers.map((fencer) => String(fencer.position)),
    rows: fencers.map((row) => ({
      name: fencerName(row),
      team: row.team,
      cells: fencers.map((column) => (column === row ? { kind: "self" } : boutCell(pool, row, column))),
    })),
  };
}

export function standingsTable(pool: PoolBoard): PoolTableData {
  return {
    headers: ["V", "V/M", "TS", "TR"],
    rows: byPosition(pool).map((fencer) => {
      const { victories, victory_ratio, touches_scored, touches_received } = fencer.standing;
      return {
        name: fencerName(fencer),
        team: fencer.team,
        cells: [String(victories), victory_ratio.toFixed(2), String(touches_scored), String(touches_received)].map(
          (label) => ({ kind: "value", label }),
        ),
      };
    }),
  };
}
