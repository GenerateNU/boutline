import type { CompetitorListResult } from "@/types/competitor";

const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

interface CompetitorFilters {
  query?: string;
  team?: string;
  rating?: string;
  gender?: string;
}

export async function getCompetitors(
  tournamentId: string,
  limit: number,
  offset: number,
  filters: CompetitorFilters = {},
): Promise<CompetitorListResult> {
  const { query, team, rating, gender } = filters;
  const url = new URL("/api/v1/competitors", API_PROXY_TARGET);
  url.searchParams.set("tournament_id", tournamentId);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (query) {
    url.searchParams.set("q", query);
  }
  if (team) {
    url.searchParams.set("team", team);
  }
  if (rating) {
    url.searchParams.set("rating", rating);
  }
  if (gender) {
    url.searchParams.set("gender", gender);
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`list competitors: ${response.status}`);
  }

  return response.json();
}
