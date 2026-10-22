import { apiGet, PAGE_SIZE, type Paginated } from "@/lib/api";
import type { Tournament } from "@/features/tournament/types/tournament";

interface ListArgs {
  search?: string;
  offset?: number;
}

export function listTournaments({ search, offset }: ListArgs = {}) {
  return apiGet<Paginated<Tournament>>("/api/v1/tournaments", {
    q: search,
    limit: PAGE_SIZE,
    offset,
  });
}
