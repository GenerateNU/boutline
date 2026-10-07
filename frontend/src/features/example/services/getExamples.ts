import type { Example } from "@/features/example/types/example";

// Stands in for a backend call until the example feature has a real endpoint.
export async function getExamples(): Promise<Example[]> {
  return [
    { id: "1", name: "First example", createdAt: "2026-10-01T12:00:00Z" },
    { id: "2", name: "Second example", createdAt: "2026-10-05T12:00:00Z" },
  ];
}
