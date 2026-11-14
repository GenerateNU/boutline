import { buildPool } from "../_fixtures/build-pool";

import { pinnedFirst } from "./pinned-first";

// In the list's incoming order, i.e. whatever sort is chosen.
const pools = [3, 10, 1, 2].map((number) => buildPool({ number, strip: `Strip ${number}`, fencers: [] }));

describe("pinnedFirst", () => {
  it.each([
    { case: "nothing pinned", pinned: [], order: [3, 10, 1, 2] },
    { case: "one pinned", pinned: ["pool-1"], order: [1, 3, 10, 2] },
    { case: "pinned pools, alphabetically with numbers as numbers", pinned: ["pool-10", "pool-2"], order: [2, 10, 3, 1] },
    { case: "every pool pinned", pinned: ["pool-3", "pool-10", "pool-1", "pool-2"], order: [1, 2, 3, 10] },
    { case: "a pinned id not in the list", pinned: ["pool-99"], order: [3, 10, 1, 2] },
  ])("orders $case", ({ pinned, order }) => {
    expect(pinnedFirst(pools, pinned).map((pool) => pool.number)).toEqual(order);
  });
});
