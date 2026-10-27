import type { Tournament } from "@/features/tournament/types/tournament";

// Not apiRequest: it fetches the relative path /api/v1/..., which only resolves
// in the browser. Server Components fetch Node-side, where a relative URL
// throws, so this hits the backend directly instead of going through the /api
// rewrite in next.config.ts.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export async function getTournament(id: string): Promise<Tournament | null> {
  const url = new URL(`/api/v1/tournaments/${encodeURIComponent(id)}`, apiProxyTarget);

  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`get tournament: ${response.status}`);
  }

  return response.json();
}
