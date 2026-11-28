import type { PoolBoard, PoolBout, PoolFencer, PoolStatus } from "@/features/pool/types/pool-board";

import { filterBouts } from "./filter-bouts";

function fencer(id: string, first: string, last: string): PoolFencer {
  return {
    competitor_id: id,
    position: 1,
    first_name: first,
    last_name: last,
    team: "Club",
    standing: { place: 1, victories: 0, matches: 0, victory_ratio: 0, touches_scored: 0, touches_received: 0, indicator: 0 },
  };
}

function bout(id: string, status: PoolBout["status"], one: string, two: string): PoolBout {
  return {
    id,
    slot: 1,
    status,
    competitor_1_id: one,
    competitor_2_id: two,
    competitor_1_score: 0,
    competitor_2_score: 0,
    winner_id: null,
    location: null,
    start_time: null,
  };
}

const POOL = {
  fencers: [fencer("a", "Ada", "Quinn"), fencer("b", "Bo", "Rivera"), fencer("c", "Cy", "Stone")],
  bouts: [bout("1", "upcoming", "a", "b"), bout("2", "active", "b", "c"), bout("3", "ended", "a", "c")],
} as PoolBoard;

describe("filterBouts", () => {
  const cases: { name: string; search: string; statuses: PoolStatus[]; ids: string[] }[] = [
    { name: "returns everything with no criteria", search: "", statuses: [], ids: ["1", "2", "3"] },
    { name: "matches either fencer by name, ignoring case", search: "RIVERA", statuses: [], ids: ["1", "2"] },
    { name: "matches a fencer's club", search: "club", statuses: [], ids: ["1", "2", "3"] },
    { name: "filters by status", search: "", statuses: ["ended"], ids: ["3"] },
    { name: "combines search and status", search: "quinn", statuses: ["upcoming"], ids: ["1"] },
    { name: "returns nothing when nothing matches", search: "zed", statuses: [], ids: [] },
  ];

  it.each(cases)("$name", ({ search, statuses, ids }) => {
    expect(filterBouts(POOL, search, statuses).map((b) => b.id)).toEqual(ids);
  });
});
