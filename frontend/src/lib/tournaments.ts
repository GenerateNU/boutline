import { apiGet, PAGE_SIZE, type Paginated } from "@/lib/api";

export type Tournament = {
  id: string;
  name: string;
  status: "pending" | "active" | "end";
  start_time: string | null;
};

type ListArgs = {
  search?: string;
  offset?: number;
};

export function listTournaments({ search, offset }: ListArgs = {}) {
  return apiGet<Paginated<Tournament>>("/api/v1/tournaments", {
    q: search,
    limit: PAGE_SIZE,
    offset,
  });
}
