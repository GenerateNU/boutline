import type { CompetitorListResult } from "@/types/competitor";

const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export async function getCompetitors(
  tournamentId: string,
  limit: number,
  offset: number,
  query?: string,
): Promise<CompetitorListResult> {
  const url = new URL("/api/v1/competitors", apiProxyTarget);
  url.searchParams.set("tournament_id", tournamentId);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (query) {
    url.searchParams.set("q", query);
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`list competitors: ${response.status}`);
  }

  return response.json();
}
