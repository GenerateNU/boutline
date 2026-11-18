import { act, renderHook } from "@testing-library/react";

import { useScrollEdges } from "@/lib/hooks/use-scroll-edges";

// jsdom does no layout, so the scroller's measurements are set by hand.
function scrollerWith(scrollLeft: number, scrollWidth: number, clientWidth = 300) {
  const scroller = document.createElement("div");
  Object.defineProperty(scroller, "scrollWidth", { value: scrollWidth });
  Object.defineProperty(scroller, "clientWidth", { value: clientWidth });
  Object.defineProperty(scroller, "scrollLeft", { value: scrollLeft, writable: true });
  return scroller;
}

describe("useScrollEdges", () => {
  it.each([
    { name: "content fits", scrollLeft: 0, scrollWidth: 300, left: false, right: false },
    { name: "at the start of overflowing content", scrollLeft: 0, scrollWidth: 600, left: false, right: true },
    { name: "in the middle", scrollLeft: 150, scrollWidth: 600, left: true, right: true },
    { name: "at the end", scrollLeft: 300, scrollWidth: 600, left: true, right: false },
    { name: "a fraction short of the end", scrollLeft: 299.5, scrollWidth: 600, left: true, right: false },
  ])("reports the hidden edges when $name", ({ scrollLeft, scrollWidth, left, right }) => {
    const ref = { current: scrollerWith(scrollLeft, scrollWidth) };

    const { result } = renderHook(() => useScrollEdges(ref));

    expect(result.current).toEqual({ canScrollLeft: left, canScrollRight: right });
  });

  it("updates when the scroller is scrolled", () => {
    const scroller = scrollerWith(0, 600);
    const ref = { current: scroller };
    const { result } = renderHook(() => useScrollEdges(ref));

    act(() => {
      scroller.scrollLeft = 300;
      scroller.dispatchEvent(new Event("scroll"));
    });

    expect(result.current).toEqual({ canScrollLeft: true, canScrollRight: false });
  });
});
