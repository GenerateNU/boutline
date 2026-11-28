import { listCompetitors } from "@/features/competitor/services/listCompetitors";
import type { Competitor } from "@/types/competitor";

// The backend's maximum page size.
const PAGE_SIZE = 100;

export async function listEventCompetitors(tournamentId: string, eventId: string): Promise<Competitor[]> {
  const competitors: Competitor[] = [];
  let total = Infinity;
  while (competitors.length < total) {
    const page = await listCompetitors({ tournamentId, eventId }, PAGE_SIZE, competitors.length);
    if (page.data.length === 0) {
      break;
    }
    competitors.push(...page.data);
    total = page.total;
  }
  return competitors;
}
