import type { TeamListResult } from "@/types/competitor";

const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export async function getTeams(
  tournamentId: string,
  limit: number,
  offset: number,
  query?: string,
): Promise<TeamListResult> {
  const url = new URL(`/api/v1/tournaments/${tournamentId}/teams`, apiProxyTarget);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (query) {
    url.searchParams.set("q", query);
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`list teams: ${response.status}`);
  }

  return response.json();
}
