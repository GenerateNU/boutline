import { pinnedFirst } from "@/features/pinning/services/pinned-first";

// In the list's incoming order, i.e. whatever sort is chosen.
const ITEMS = ["Pool 3", "Pool 10", "pool 1", "Pool 2"];

describe("pinnedFirst", () => {
  it.each([
    { case: "nothing pinned", pinned: [], order: ["Pool 3", "Pool 10", "pool 1", "Pool 2"] },
    { case: "one pinned", pinned: ["pool 1"], order: ["pool 1", "Pool 3", "Pool 10", "Pool 2"] },
    {
      case: "pinned items alphabetically, numbers as numbers",
      pinned: ["Pool 10", "Pool 2"],
      order: ["Pool 2", "Pool 10", "Pool 3", "pool 1"],
    },
    {
      case: "every item pinned, ignoring case",
      pinned: ITEMS,
      order: ["pool 1", "Pool 2", "Pool 3", "Pool 10"],
    },
    { case: "a pinned item not in the list", pinned: ["Pool 99"], order: ITEMS },
  ])("orders $case", ({ pinned, order }) => {
    const ordered = pinnedFirst(ITEMS, (item) => pinned.includes(item), (item) => item);

    expect(ordered).toEqual(order);
  });
});
