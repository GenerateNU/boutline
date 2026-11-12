import { useEffect } from "react";

// While `active`, the browser asks before closing or reloading the page, so work that
// hasn't reached the server yet isn't dropped without the user knowing.
export function useWarnBeforeUnload(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [active]);
}
