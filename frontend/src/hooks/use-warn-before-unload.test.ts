import { renderHook } from "@testing-library/react";

import { useWarnBeforeUnload } from "./use-warn-before-unload";

function leavePage() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("useWarnBeforeUnload", () => {
  it.each([
    { name: "warns while active", active: true, warned: true },
    { name: "stays quiet while inactive", active: false, warned: false },
  ])("$name", ({ active, warned }) => {
    renderHook(() => useWarnBeforeUnload(active));

    expect(leavePage()).toBe(warned);
  });

  it("stops warning once the work is done", () => {
    const { rerender } = renderHook(({ active }) => useWarnBeforeUnload(active), { initialProps: { active: true } });

    rerender({ active: false });

    expect(leavePage()).toBe(false);
  });
});
