import { BoutStatus } from "@/types/bout";

import { PoolBoard, PoolBout, PoolFencer } from "../_types/pool-board";

export const placeholderPinnedPoolIds = ["pool-1"];

type StandingRow = [place: number, victories: number, matches: number, ratio: number, scored: number, received: number];

function fencer(
  position: number,
  first: string,
  last: string,
  team: string,
  [place, victories, matches, ratio, scored, received]: StandingRow,
): PoolFencer {
  return {
    competitor_id: `${first}-${last}`.toLowerCase().replace("'", ""),
    position,
    first_name: first,
    last_name: last,
    team,
    standing: {
      place,
      victories,
      matches,
      victory_ratio: ratio,
      touches_scored: scored,
      touches_received: received,
      indicator: scored - received,
    },
  };
}

function bout(
  pool: number,
  number: number,
  strip: string,
  [first, second]: [PoolFencer, PoolFencer],
  [score1, score2]: [number, number],
  status: BoutStatus,
  startTime: string | null,
): PoolBout {
  const winner = score1 > score2 ? first : second;
  return {
    id: `pool-${pool}-bout-${number}`,
    status,
    competitor_1_id: first.competitor_id,
    competitor_2_id: second.competitor_id,
    competitor_1_score: score1,
    competitor_2_score: score2,
    winner_id: status === "end" ? winner.competitor_id : null,
    location: strip,
    start_time: startTime,
  };
}

const NO_STANDING: StandingRow = [1, 0, 0, 0, 0, 0];

const yan = fencer(1, "Yan", "Wang", "New York Fencers Club", [1, 1, 2, 0.5, 9, 7]);
const caitlin = fencer(2, "Caitlin", "Lee", "New York Fencers Club", [2, 1, 2, 0.5, 7, 6]);
const claire = fencer(3, "Claire", "Min", "Boston Fencing Club", [3, 1, 2, 0.5, 8, 9]);
const traci = fencer(4, "Traci", "Lu", "MIT Fencing", [4, 1, 2, 0.5, 6, 8]);

const maya = fencer(1, "Maya", "Chen", "Boston Fencing Club", [3, 2, 4, 0.5, 16, 13]);
const liam = fencer(2, "Liam", "O'Brien", "Northeastern Fencing", [2, 2, 4, 0.5, 17, 14]);
const priya = fencer(3, "Priya", "Patel", "Cambridge FC", [1, 3, 4, 0.75, 16, 15]);
const hana = fencer(4, "Hana", "Sato", "Northeastern Fencing", [4, 2, 4, 0.5, 12, 15]);
const noah = fencer(5, "Noah", "Williams", "Boston Fencing Club", [5, 1, 4, 0.25, 13, 17]);

const sofia = fencer(1, "Sofia", "Rossi", "Boston Fencing Club", NO_STANDING);
const kenji = fencer(2, "Kenji", "Tanaka", "Northeastern Fencing", NO_STANDING);
const amara = fencer(3, "Amara", "Okafor", "Cambridge FC", NO_STANDING);
const ethan = fencer(4, "Ethan", "Kowalski", "MIT Fencing", NO_STANDING);

const pool4Fencers = [
  fencer(1, "Lucas", "Martin", "Boston Fencing Club", [5, 1, 2, 0.5, 8, 9]),
  fencer(2, "Ava", "Johnson", "MIT Fencing", [1, 2, 2, 1, 10, 6]),
  fencer(3, "Mateo", "Garcia", "Cambridge FC", [3, 1, 2, 0.5, 8, 7]),
  fencer(4, "Zoe", "Kim", "New York Fencers Club", [4, 1, 2, 0.5, 7, 7]),
  fencer(5, "Oliver", "Brown", "Northeastern Fencing", [2, 1, 2, 0.5, 9, 5]),
  fencer(6, "Isla", "Nguyen", "Boston Fencing Club", [6, 1, 2, 0.5, 5, 6]),
  fencer(7, "Felix", "Wagner", "MIT Fencing", [7, 1, 2, 0.5, 7, 9]),
  fencer(8, "Nora", "Silva", "Cambridge FC", [8, 0, 2, 0, 5, 10]),
];

// Fencer positions per bout, in bout order; the first eight are ended, the ninth is live.
const pool4Pairings: [number, number][] = [
  [2, 3], [1, 5], [7, 4], [6, 8], [1, 2], [3, 4], [5, 6], [8, 7], [4, 1], [5, 2], [8, 3], [6, 7], [4, 2], [8, 1],
  [7, 5], [3, 6], [2, 8], [5, 4], [6, 1], [3, 7], [4, 8], [2, 6], [3, 5], [1, 7], [4, 6], [8, 5], [7, 2], [1, 3],
];
const pool4Scores: [number, number][] = [[5, 3], [5, 4], [2, 5], [5, 1], [3, 5], [5, 2], [5, 0], [4, 5], [3, 2]];
const pool4StartTimes = ["10:05", "10:12", "10:19", "10:26", "10:33", "10:40", "10:47", "10:54", "11:01"];

function pool4Status(index: number): BoutStatus {
  if (index < 8) {
    return "end";
  }
  return index === 8 ? "active" : "upcoming";
}

export const poolBoards: PoolBoard[] = [
  {
    id: "pool-1",
    pool_stage_id: "stage-1",
    number: 1,
    strip: "Strip 3",
    status: "active",
    start_time: "2026-10-24T09:00:00Z",
    started_at: "2026-10-24T09:04:00Z",
    completed_at: null,
    fencers: [yan, caitlin, claire, traci],
    bouts: [
      bout(1, 1, "Strip 3", [yan, caitlin], [5, 2], "end", "2026-10-24T09:05:00Z"),
      bout(1, 2, "Strip 3", [traci, claire], [5, 3], "end", "2026-10-24T09:15:00Z"),
      bout(1, 3, "Strip 3", [claire, yan], [5, 4], "end", "2026-10-24T09:25:00Z"),
      bout(1, 4, "Strip 3", [caitlin, traci], [5, 1], "end", "2026-10-24T09:35:00Z"),
      bout(1, 5, "Strip 3", [yan, traci], [2, 1], "active", "2026-10-24T09:45:00Z"),
      bout(1, 6, "Strip 3", [caitlin, claire], [0, 0], "upcoming", null),
    ],
  },
  {
    id: "pool-2",
    pool_stage_id: "stage-1",
    number: 2,
    strip: "Strip 4",
    status: "ended",
    start_time: "2026-10-24T09:00:00Z",
    started_at: "2026-10-24T09:02:00Z",
    completed_at: "2026-10-24T10:20:00Z",
    fencers: [maya, liam, priya, hana, noah],
    bouts: [
      bout(2, 1, "Strip 4", [maya, liam], [5, 3], "end", "2026-10-24T09:05:00Z"),
      bout(2, 2, "Strip 4", [priya, maya], [5, 4], "end", "2026-10-24T09:12:00Z"),
      bout(2, 3, "Strip 4", [maya, hana], [5, 0], "end", "2026-10-24T09:20:00Z"),
      bout(2, 4, "Strip 4", [noah, maya], [5, 2], "end", "2026-10-24T09:28:00Z"),
      bout(2, 5, "Strip 4", [liam, priya], [5, 1], "end", "2026-10-24T09:36:00Z"),
      bout(2, 6, "Strip 4", [hana, liam], [5, 4], "end", "2026-10-24T09:44:00Z"),
      bout(2, 7, "Strip 4", [liam, noah], [5, 3], "end", "2026-10-24T09:52:00Z"),
      bout(2, 8, "Strip 4", [priya, hana], [5, 2], "end", "2026-10-24T10:00:00Z"),
      bout(2, 9, "Strip 4", [priya, noah], [5, 4], "end", "2026-10-24T10:08:00Z"),
      bout(2, 10, "Strip 4", [hana, noah], [5, 1], "end", "2026-10-24T10:15:00Z"),
    ],
  },
  {
    id: "pool-3",
    pool_stage_id: "stage-1",
    number: 3,
    strip: "Strip 5",
    status: "upcoming",
    start_time: "2026-10-24T10:30:00Z",
    started_at: null,
    completed_at: null,
    fencers: [sofia, kenji, amara, ethan],
    bouts: [
      bout(3, 1, "Strip 5", [sofia, kenji], [0, 0], "upcoming", null),
      bout(3, 2, "Strip 5", [amara, ethan], [0, 0], "upcoming", null),
      bout(3, 3, "Strip 5", [sofia, amara], [0, 0], "upcoming", null),
      bout(3, 4, "Strip 5", [kenji, ethan], [0, 0], "upcoming", null),
      bout(3, 5, "Strip 5", [sofia, ethan], [0, 0], "upcoming", null),
      bout(3, 6, "Strip 5", [kenji, amara], [0, 0], "upcoming", null),
    ],
  },
  {
    id: "pool-4",
    pool_stage_id: "stage-1",
    number: 4,
    strip: "Strip 2",
    status: "active",
    start_time: "2026-10-24T10:00:00Z",
    started_at: "2026-10-24T10:03:00Z",
    completed_at: null,
    fencers: pool4Fencers,
    bouts: pool4Pairings.map(([first, second], index) =>
      bout(
        4,
        index + 1,
        "Strip 2",
        [pool4Fencers[first - 1], pool4Fencers[second - 1]],
        pool4Scores[index] ?? [0, 0],
        pool4Status(index),
        pool4StartTimes[index] ? `2026-10-24T${pool4StartTimes[index]}:00Z` : null,
      ),
    ),
  },
];
