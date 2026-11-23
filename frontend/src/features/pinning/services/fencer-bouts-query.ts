import type { FencerBout } from "@/features/pinning/types/fencer-bout";
import { tableauRoundName } from "@/lib/tableau-round-name";
import { apiRequest } from "@/services/api-request";
import type { BoutStatus } from "@/types/bout";
import type { Competitor } from "@/types/competitor";

// One bout as GET /competitors/{id}/bouts returns it, already from that fencer's side.
interface CompetitorBoutResponse {
  id: string;
  status: BoutStatus;
  pool_id: string | null;
  pool_number: number | null;
  round_size: number | null;
  opponent: { first_name: string; last_name: string };
  score: number | null;
  opponent_score: number | null;
}

function toFencerBout(bout: CompetitorBoutResponse): FencerBout {
  return {
    id: bout.id,
    poolId: bout.pool_id,
    stage: bout.pool_number !== null ? `Pool ${bout.pool_number}` : tableauRoundName(bout.round_size ?? 0).boutName,
    opponent: `${bout.opponent.first_name} ${bout.opponent.last_name}`,
    status: bout.status,
    score: bout.score !== null && bout.opponent_score !== null ? [bout.score, bout.opponent_score] : null,
  };
}

async function fetchFencerBouts(fencers: Competitor[]): Promise<Record<string, FencerBout[]>> {
  const entries = await Promise.all(
    fencers.map(async ({ id }) => {
      const { data } = await apiRequest<{ data: CompetitorBoutResponse[] }>(
        `/competitors/${encodeURIComponent(id)}/bouts`,
      );
      return [id, data.map(toFencerBout)] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export { fetchFencerBouts };
