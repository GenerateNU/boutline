import type { CounterConfig } from "@/features/example/types/counter";

// Stands in for a backend call until the example feature has a real endpoint.
export async function getCounterConfig(): Promise<CounterConfig> {
  return { initial: 0, min: 0, max: 10 };
}
