import { render, screen } from "@testing-library/react";

import { PinnedFirstList, type PinnedFirstEntry } from "@/features/pinning/components/pinned-first-list";
import { PINNED_STORAGE_KEY, type PinnedItems } from "@/features/pinning/types/pinning";

const POOL_EVENT = { tournamentId: "t1", eventId: "e1", eventName: "Mixed Épée" };

// One entry of each listable kind, in the list's incoming order.
const ENTRIES: PinnedFirstEntry[] = [
  { key: "f1", label: "Yan Wang", pin: { kind: "fencer", item: "f1" }, node: "Yan Wang" },
  { key: "c1", label: "Boston Blade", pin: { kind: "club", item: { tournamentId: "t1", name: "Boston Blade" } }, node: "Boston Blade" },
  { key: "p10", label: "Pool 10", pin: { kind: "pool", item: { ...POOL_EVENT, id: "p10", title: "Pool 10" } }, node: "Pool 10" },
  { key: "p2", label: "Pool 2", pin: { kind: "pool", item: { ...POOL_EVENT, id: "p2", title: "Pool 2" } }, node: "Pool 2" },
];

function seed(pins: Partial<PinnedItems>) {
  sessionStorage.setItem(
    PINNED_STORAGE_KEY,
    JSON.stringify({ fencerIds: [], clubs: [], pools: [], tableaus: [], ...pins }),
  );
}

function rows() {
  return screen.getAllByRole("listitem").map((item) => item.textContent);
}

describe("PinnedFirstList", () => {
  beforeEach(() => sessionStorage.clear());

  it.each([
    { case: "nothing pinned", pins: {}, order: ["Yan Wang", "Boston Blade", "Pool 10", "Pool 2"] },
    { case: "a pinned fencer", pins: { fencerIds: ["f1"] }, order: ["Yan Wang", "Boston Blade", "Pool 10", "Pool 2"] },
    {
      case: "a pinned club",
      pins: { clubs: [{ tournamentId: "t1", name: "Boston Blade" }] },
      order: ["Boston Blade", "Yan Wang", "Pool 10", "Pool 2"],
    },
    {
      case: "pinned pools, numbers compared as numbers",
      pins: { pools: [{ ...POOL_EVENT, id: "p10", title: "Pool 10" }, { ...POOL_EVENT, id: "p2", title: "Pool 2" }] },
      order: ["Pool 2", "Pool 10", "Yan Wang", "Boston Blade"],
    },
    {
      case: "every entry pinned, alphabetically",
      pins: {
        fencerIds: ["f1"],
        clubs: [{ tournamentId: "t1", name: "Boston Blade" }],
        pools: [{ ...POOL_EVENT, id: "p10", title: "Pool 10" }, { ...POOL_EVENT, id: "p2", title: "Pool 2" }],
      },
      order: ["Boston Blade", "Pool 2", "Pool 10", "Yan Wang"],
    },
    {
      case: "a club pinned in another tournament",
      pins: { clubs: [{ tournamentId: "t2", name: "Boston Blade" }] },
      order: ["Yan Wang", "Boston Blade", "Pool 10", "Pool 2"],
    },
  ])("orders $case", ({ pins, order }) => {
    seed(pins);

    render(<PinnedFirstList entries={ENTRIES} />);

    expect(rows()).toEqual(order);
  });
});
