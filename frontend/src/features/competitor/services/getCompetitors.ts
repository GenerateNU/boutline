import type { CompetitorListResult } from "@/types/competitor";

const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export async function getCompetitors(
  tournamentId: string,
  limit: number,
  offset: number,
  query?: string,
  team?: string,
): Promise<CompetitorListResult> {
  const url = new URL("/api/v1/competitors", apiProxyTarget);
  url.searchParams.set("tournament_id", tournamentId);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (query) {
    url.searchParams.set("q", query);
  }
  // Unlike q's fuzzy name match, team must equal the club name exactly.
  if (team) {
    url.searchParams.set("team", team);
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`list competitors: ${response.status}`);
  }

  return response.json();
}
