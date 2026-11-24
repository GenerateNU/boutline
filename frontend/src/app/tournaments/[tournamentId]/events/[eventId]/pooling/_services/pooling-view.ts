export type PoolingView = "pools" | "results";

// Anything but ?view=results shows the pools, so a stale or mistyped link still lands on a view.
export function poolingView(value: string | null): PoolingView {
  return value === "results" ? "results" : "pools";
}
