import { act, renderHook } from "@testing-library/react";

import { useCollapsedPools } from "./use-collapsed-pools";

describe("useCollapsedPools", () => {
  it("starts with every pool open", () => {
    const { result } = renderHook(() => useCollapsedPools());

    expect(result.current.collapsedIds.size).toBe(0);
  });

  it("collapses and reopens one pool", () => {
    const { result } = renderHook(() => useCollapsedPools());

    act(() => result.current.setPoolOpen("pool-1", false));
    expect([...result.current.collapsedIds]).toEqual(["pool-1"]);

    act(() => result.current.setPoolOpen("pool-1", true));
    expect(result.current.collapsedIds.size).toBe(0);
  });

  it("collapses and opens every pool at once", () => {
    const { result } = renderHook(() => useCollapsedPools());

    act(() => result.current.setAllOpen(["pool-1", "pool-2"], false));
    expect([...result.current.collapsedIds]).toEqual(["pool-1", "pool-2"]);

    act(() => result.current.setAllOpen(["pool-1", "pool-2"], true));
    expect(result.current.collapsedIds.size).toBe(0);
  });
});
