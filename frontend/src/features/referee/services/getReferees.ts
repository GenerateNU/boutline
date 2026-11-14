import type { RefereeResponse } from "@/features/referee/types/referee";
import type { ListResponse } from "@/types/list-response";

const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export async function getReferees(
  tournamentId: string,
  limit: number,
  offset: number,
  query?: string,
): Promise<ListResponse<RefereeResponse>> {
  const url = new URL(`/api/v1/tournaments/${tournamentId}/users`, API_PROXY_TARGET);
  url.searchParams.set("role", "referee");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (query) {
    url.searchParams.set("q", query);
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`list referees: ${response.status}`);
  }

  return response.json();
}
