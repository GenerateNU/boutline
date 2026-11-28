import { serverRequest } from "@/services/server-request";
import { CompetitorListResult } from "@/types/competitor";

interface CompetitorFilters {
  eventId?: string;
  query?: string;
  team?: string;
  rating?: string;
  gender?: string;
  checkedIn?: string;
  weapon?: string;
  ageCategory?: string;
}

export function getCompetitors(
  tournamentId: string,
  limit: number,
  offset: number,
  { eventId, query, team, rating, gender, checkedIn, weapon, ageCategory }: CompetitorFilters = {},
): Promise<CompetitorListResult> {
  return serverRequest<CompetitorListResult>("/competitors", {
    params: {
      tournament_id: tournamentId,
      limit,
      offset,
      eventId,
      q: query,
      team,
      rating,
      gender,
      checkedIn,
      weapon,
      ageCategory,
    },
  });
}
