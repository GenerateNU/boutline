import { apiGet, PAGE_SIZE, type Paginated } from "@/lib/api";

export type Competitor = {
  id: string;
  tournamentId: string;
  firstName: string;
  lastName: string;
  rating: string;
  team: string;
};

export type Team = {
  name: string;
  competitorCount: number;
};

type ListArgs = {
  tournamentId: string;
  search?: string;
  offset?: number;
};

export function listCompetitors({ tournamentId, search, offset }: ListArgs) {
  return apiGet<Paginated<Competitor>>("/api/v1/competitors", {
    tournament_id: tournamentId,
    search,
    limit: PAGE_SIZE,
    offset,
  });
}

export function listTeams({ tournamentId, search, offset }: ListArgs) {
  return apiGet<Paginated<Team>>(`/api/v1/tournaments/${tournamentId}/teams`, {
    search,
    limit: PAGE_SIZE,
    offset,
  });
}
