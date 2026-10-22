import { act, renderHook } from "@testing-library/react";

import { usePinnedPools } from "./use-pinned-pools";

describe("usePinnedPools", () => {
  it("starts with the seeded pinned pool", () => {
    const { result } = renderHook(() => usePinnedPools());

    expect([...result.current.pinnedIds]).toEqual(["pool-1"]);
  });

  it("pins a pool when toggled and unpins it when toggled again", () => {
    const { result } = renderHook(() => usePinnedPools());

    act(() => result.current.togglePinned("pool-2"));
    expect(result.current.pinnedIds.has("pool-2")).toBe(true);
    expect(result.current.pinnedIds.has("pool-1")).toBe(true);

    act(() => result.current.togglePinned("pool-2"));
    expect(result.current.pinnedIds.has("pool-2")).toBe(false);
  });
});
