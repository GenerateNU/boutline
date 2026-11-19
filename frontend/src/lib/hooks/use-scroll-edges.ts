import { RefObject, useEffect, useState } from "react";

// Tracks whether a horizontal scroller has content hidden past its left or right
// edge, so the caller can fade that edge as a hint that it scrolls.
function useScrollEdges(ref: RefObject<HTMLElement | null>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const scroller = ref.current;
    if (!scroller) {
      return;
    }

    const measure = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scroller;
      // 1px of slack: zoomed layouts report fractional widths, so a scroller
      // at its end can sit a fraction of a pixel short of scrollWidth.
      setCanScrollLeft(scrollLeft > 1);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    };

    measure();
    scroller.addEventListener("scroll", measure, { passive: true });
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", measure);
      resizeObserver.disconnect();
    };
  }, [ref]);

  return { canScrollLeft, canScrollRight };
}

export { useScrollEdges };
