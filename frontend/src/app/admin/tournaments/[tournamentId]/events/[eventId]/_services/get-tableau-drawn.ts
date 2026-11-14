// Not apiRequest: it fetches the relative path /api/v1/..., which only resolves
// in the browser. Server Components fetch Node-side, where a relative URL
// throws, so this hits the backend directly.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

// The tableau has no rounds until it is drawn.
export async function getTableauDrawn(eventId: string): Promise<boolean> {
  const url = new URL(`/api/v1/events/${encodeURIComponent(eventId)}/tableau`, API_PROXY_TARGET);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`get tableau: ${response.status}`);
  }

  const { rounds }: { rounds: unknown[] } = await response.json();
  return rounds.length > 0;
}
