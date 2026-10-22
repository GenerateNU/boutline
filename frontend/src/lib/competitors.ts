import { apiGet, PAGE_SIZE, type Paginated } from "@/lib/api";
import type { Competitor, Team } from "@/types/competitor";

interface ListArgs {
  tournamentId: string;
  search?: string;
  offset?: number;
}

export function listCompetitors({ tournamentId, search, offset }: ListArgs) {
  return apiGet<Paginated<Competitor>>("/api/v1/competitors", {
    tournament_id: tournamentId,
    q: search,
    limit: PAGE_SIZE,
    offset,
  });
}

export function listTeams({ tournamentId, search, offset }: ListArgs) {
  return apiGet<Paginated<Team>>(`/api/v1/tournaments/${tournamentId}/teams`, {
    q: search,
    limit: PAGE_SIZE,
    offset,
  });
}
