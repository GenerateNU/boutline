import { useCallback, useEffect, useRef } from "react";

// Keeps the latest callback in a ref so the debounced function's identity
// stays stable across renders without re-arming the timer on every keystroke.
function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  const cancel = useCallback(() => clearTimeout(timer.current), []);

  useEffect(() => cancel, [cancel]);

  const debounced = useCallback(
    (...args: Args) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => callbackRef.current(...args), delayMs);
    },
    [delayMs],
  );

  return [debounced, cancel] as const;
}

export { useDebouncedCallback };
