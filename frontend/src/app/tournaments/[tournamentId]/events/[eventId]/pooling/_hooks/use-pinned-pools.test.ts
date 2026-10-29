import { act, renderHook } from "@testing-library/react";

import { usePinnedPools } from "./use-pinned-pools";

describe("usePinnedPools", () => {
  beforeEach(() => localStorage.clear());

  it.each([
    { case: "nothing is stored", stored: null },
    { case: "the stored value is corrupt", stored: "{" },
    { case: "the stored value is not a list of ids", stored: '{"a":1}' },
  ])("starts with the seeded pinned pool when $case", ({ stored }) => {
    if (stored !== null) {
      localStorage.setItem("boutline:pinned-pools:e", stored);
    }
    const { result } = renderHook(() => usePinnedPools("e"));

    expect([...result.current.pinnedIds]).toEqual(["pool-1"]);
  });

  it("pins a pool when toggled and unpins it when toggled again", () => {
    const { result } = renderHook(() => usePinnedPools("e"));

    act(() => result.current.togglePinned("pool-2"));
    expect([...result.current.pinnedIds]).toEqual(["pool-1", "pool-2"]);

    act(() => result.current.togglePinned("pool-2"));
    expect([...result.current.pinnedIds]).toEqual(["pool-1"]);
  });

  it("shares a change with another hook instance for the same event", () => {
    const first = renderHook(() => usePinnedPools("e"));
    const second = renderHook(() => usePinnedPools("e"));

    act(() => first.result.current.togglePinned("pool-3"));

    expect(second.result.current.pinnedIds.has("pool-3")).toBe(true);
  });

  it("leaves other events unaffected", () => {
    const first = renderHook(() => usePinnedPools("e"));
    const other = renderHook(() => usePinnedPools("other"));

    act(() => first.result.current.togglePinned("pool-3"));

    expect([...other.result.current.pinnedIds]).toEqual(["pool-1"]);
  });

  it("persists unpinning everything as an empty list", () => {
    const { result, unmount } = renderHook(() => usePinnedPools("e"));

    act(() => result.current.togglePinned("pool-1"));
    unmount();
    const remounted = renderHook(() => usePinnedPools("e"));

    expect(remounted.result.current.pinnedIds.size).toBe(0);
  });
});
