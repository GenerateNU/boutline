import { act, renderHook } from "@testing-library/react";
import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";
import { PINNED_MAX_IDS, PINNED_STORAGE_KEY } from "@/features/pinning/types/pinning";

const EVENT = { tournamentId: "t1", eventId: "e1", eventName: "Men's Epee" };
const CLUB = { tournamentId: "t1", name: "Salle" };
const POOL = { ...EVENT, id: "p1", title: "Pool 1" };

const CASES = [
  ["fencer", "f1", "fencerIds"],
  ["club", CLUB, "clubs"],
  ["pool", POOL, "pools"],
  ["tableau", EVENT, "tableaus"],
] as const;

function storedJson() {
  return JSON.parse(sessionStorage.getItem(PINNED_STORAGE_KEY) ?? "null");
}

beforeEach(() => sessionStorage.clear());

describe("usePinnedItems", () => {
  it.each(CASES)("toggles a %s on then off", (kind, item, field) => {
    const { result } = renderHook(() => usePinnedItems());
    // Cases mix item types, so the generic signature can't be satisfied per row.
    const toggle = () => act(() => result.current.togglePin(kind, item as never));

    expect(result.current.isPinned(kind, item as never)).toBe(false);
    toggle();
    expect(result.current.isPinned(kind, item as never)).toBe(true);
    expect(storedJson()[field]).toEqual([item]);
    toggle();
    expect(result.current.isPinned(kind, item as never)).toBe(false);
    expect(storedJson()[field]).toEqual([]);
  });

  it("identifies a club by tournament and name", () => {
    const { result } = renderHook(() => usePinnedItems());
    const other = { tournamentId: "t2", name: CLUB.name };
    act(() => result.current.togglePin("club", CLUB));
    expect(result.current.isPinned("club", other)).toBe(false);
    act(() => result.current.togglePin("club", other));
    expect(storedJson().clubs).toEqual([CLUB, other]);
  });

  it("ignores a pin past the per-kind cap", () => {
    const { result } = renderHook(() => usePinnedItems());
    for (let i = 0; i <= PINNED_MAX_IDS; i++) {
      act(() => result.current.togglePin("fencer", `f${i}`));
    }
    expect(result.current.pinned.fencerIds).toHaveLength(PINNED_MAX_IDS);
    expect(result.current.isPinned("fencer", `f${PINNED_MAX_IDS}`)).toBe(false);
  });

  it("keeps fencerIds identity when a club is toggled", () => {
    const { result } = renderHook(() => usePinnedItems());
    act(() => result.current.togglePin("fencer", "f1"));
    const before = result.current.pinned.fencerIds;
    act(() => result.current.togglePin("club", CLUB));
    expect(result.current.pinned.fencerIds).toBe(before);
  });

  it.each([
    { case: "null", stored: null, want: {} },
    { case: "a string", stored: "x", want: {} },
    { case: "a number", stored: 3, want: {} },
    { case: "legacy fencers and bouts", stored: { fencerIds: ["a"], boutIds: ["b"] }, want: { fencerIds: ["a"] } },
    {
      case: "legacy fencers, bouts and pools",
      stored: { fencerIds: ["a"], boutIds: ["b"], poolIds: ["p"] },
      want: { fencerIds: ["a"] },
    },
    { case: "a non-array field", stored: { fencerIds: "a", clubs: [CLUB] }, want: { clubs: [CLUB] } },
    {
      case: "the current shape",
      stored: { fencerIds: ["a"], clubs: [CLUB], pools: [POOL], tableaus: [EVENT] },
      want: { fencerIds: ["a"], clubs: [CLUB], pools: [POOL], tableaus: [EVENT] },
    },
  ])("reads $case from storage", ({ stored, want }) => {
    sessionStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(stored));

    const { result } = renderHook(() => usePinnedItems());

    expect(result.current.pinned).toEqual({ fencerIds: [], clubs: [], pools: [], tableaus: [], ...want });
  });

  it("writes exactly the four keys when toggling on legacy storage", () => {
    sessionStorage.setItem(
      PINNED_STORAGE_KEY,
      JSON.stringify({ fencerIds: ["f1"], boutIds: ["b1"], poolIds: ["p1"] }),
    );
    const { result } = renderHook(() => usePinnedItems());
    act(() => result.current.togglePin("club", CLUB));
    expect(storedJson()).toEqual({ fencerIds: ["f1"], clubs: [CLUB], pools: [], tableaus: [] });
  });
});
