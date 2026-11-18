import { apiRequest } from "@/services/api-request";
import type { CompetitorListResult } from "@/types/competitor";

export interface CompetitorQuery {
  tournamentId: string;
  eventId?: string;
  query?: string;
  team?: string;
  rating?: string;
  gender?: string;
}

// The browser-side twin of getCompetitors, for loading more rows after the first page.
export function listCompetitors(
  { tournamentId, eventId, query, team, rating, gender }: CompetitorQuery,
  limit: number,
  offset: number,
): Promise<CompetitorListResult> {
  const params = new URLSearchParams({ tournament_id: tournamentId, limit: `${limit}`, offset: `${offset}` });
  for (const [key, value] of Object.entries({ eventId, q: query, team, rating, gender })) {
    if (value) {
      params.set(key, value);
    }
  }
  return apiRequest<CompetitorListResult>(`/competitors?${params}`);
}
