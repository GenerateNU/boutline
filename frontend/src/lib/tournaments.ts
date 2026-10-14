import { apiGet, PAGE_SIZE, type Paginated } from "@/lib/api";

export type Tournament = {
  id: string;
  name: string;
  status: "pending" | "active" | "end";
  start_time: string | null;
};

export function listTournaments() {
  return apiGet<Paginated<Tournament>>("/api/v1/tournaments", {
    limit: PAGE_SIZE,
  });
}
