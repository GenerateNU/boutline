import { Tournament } from "@/features/tournament/types/tournament";
import { ApiError } from "@/services/api-request";
import { serverRequest } from "@/services/server-request";

export async function getTournament(id: string): Promise<Tournament | null> {
  try {
    return await serverRequest<Tournament>(`/tournaments/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}
