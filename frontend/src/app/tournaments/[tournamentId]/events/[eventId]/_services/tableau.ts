import { tableauRoundName } from "@/lib/tableau-round-name";
import type { Tableau, TableauFencer } from "../_types/tableau";
import type { TableauFencerResponse, TableauResponse } from "../_types/tableau-response";

const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

function toTableauFencer(fencer: TableauFencerResponse): TableauFencer {
  return {
    id: fencer.id,
    firstName: fencer.first_name,
    lastName: fencer.last_name,
    club: fencer.club,
    seed: fencer.seed,
  };
}

export async function getTableau(eventId: string): Promise<Tableau> {
  // Fetched directly rather than via apiRequest: a Server Component can't resolve a relative /api/v1 path.
  const url = new URL(`/api/v1/events/${encodeURIComponent(eventId)}/tableau`, apiProxyTarget);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`get tableau: ${response.status}`);
  }

  const body: TableauResponse = await response.json();
  return {
    rounds: body.rounds.map((round) => ({
      id: String(round.size),
      ...tableauRoundName(round.size),
      bouts: round.bouts.map((bout) => ({
        id: bout.id,
        number: bout.slot,
        top: toTableauFencer(bout.top),
        bottom: toTableauFencer(bout.bottom),
        topScore: bout.top_score ?? undefined,
        bottomScore: bout.bottom_score ?? undefined,
      })),
    })),
  };
}
