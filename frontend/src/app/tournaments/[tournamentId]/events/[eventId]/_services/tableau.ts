import { tableauRoundName } from "@/lib/tableau-round-name";
import { serverRequest } from "@/services/server-request";
import type { Tableau, TableauFencer } from "../_types/tableau";
import type { TableauFencerResponse, TableauResponse } from "../_types/tableau-response";

function toTableauFencer(fencer: TableauFencerResponse): TableauFencer {
  return {
    id: fencer.id,
    firstName: fencer.first_name,
    lastName: fencer.last_name,
    club: fencer.club ?? "",
    seed: fencer.seed,
  };
}

export async function getTableau(eventId: string): Promise<Tableau> {
  const body = await serverRequest<TableauResponse>(`/events/${encodeURIComponent(eventId)}/tableau`);
  return {
    rounds: body.rounds.map((round) => ({
      id: String(round.size),
      size: round.size,
      ...tableauRoundName(round.size),
      bouts: round.bouts.map((bout) => ({
        id: bout.id,
        number: bout.slot,
        status: bout.status,
        top: toTableauFencer(bout.top),
        bottom: toTableauFencer(bout.bottom),
        topScore: bout.top_score ?? undefined,
        bottomScore: bout.bottom_score ?? undefined,
      })),
    })),
  };
}
