import type { Event } from "@/features/event/types/event";

// Server Components fetch Node-side, so this hits the backend directly
// instead of going through the /api rewrite in next.config.ts.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

// Returns null for an id the backend does not know or cannot parse (404 or
// 422), so the caller can render a not-found page.
export async function getEvent(eventId: string): Promise<Event | null> {
  const url = new URL(`/api/v1/events/${encodeURIComponent(eventId)}`, apiProxyTarget);
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404 || response.status === 422) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`get event: ${response.status}`);
  }

  return response.json();
}
