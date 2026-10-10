"use client";

import { useCounter } from "@/features/example/hooks/useCounter";
import type { CounterConfig } from "@/features/example/types/counter";

export type CounterProps = {
  config: CounterConfig;
};

export function Counter({ config }: CounterProps) {
  const { count, increment, decrement, reset, atMin, atMax } = useCounter(config);

  return (
    <div className="flex items-center gap-4">
      <button type="button" aria-label="Decrement" onClick={decrement} disabled={atMin} className="disabled:opacity-40">
        −
      </button>
      <output aria-live="polite" className="text-2xl font-bold tabular-nums">
        {count}
      </output>
      <button type="button" aria-label="Increment" onClick={increment} disabled={atMax} className="disabled:opacity-40">
        +
      </button>
      <button type="button" onClick={reset}>
        Reset
      </button>
    </div>
  );
}
