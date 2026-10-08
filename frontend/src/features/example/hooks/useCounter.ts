import { useState } from "react";
import type { CounterConfig } from "@/features/example/types/counter";
import { clamp } from "@/features/example/utils/clamp";

export function useCounter({ initial, min, max }: CounterConfig) {
  const [count, setCount] = useState(() => clamp(initial, min, max));

  const step = (delta: number) =>
    setCount((current) => clamp(current + delta, min, max));

  return {
    count,
    increment: () => step(1),
    decrement: () => step(-1),
    reset: () => setCount(clamp(initial, min, max)),
    atMin: count === min,
    atMax: count === max,
  };
}
