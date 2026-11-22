import type { TableauResponse } from "@/app/tournaments/[tournamentId]/events/[eventId]/_types/tableau-response";
import type { PoolBoardList } from "@/app/tournaments/[tournamentId]/events/[eventId]/pooling/_types/pool-board";
import type { FencerBout } from "@/features/pinning/types/fencer-bout";
import { tableauRoundName } from "@/lib/tableau-round-name";
import { apiRequest } from "@/services/api-request";
import type { Competitor } from "@/types/competitor";

interface EventBouts {
  pools: PoolBoardList["data"];
  tableau: TableauResponse["rounds"];
}

// One page of pool sheets is the backend maximum.
async function fetchEventBouts(eventId: string): Promise<EventBouts> {
  const params = new URLSearchParams({ event_id: eventId, limit: "100" });
  const [pools, tableau] = await Promise.all([
    apiRequest<PoolBoardList>(`/pool-sheets?${params}`),
    apiRequest<TableauResponse>(`/events/${encodeURIComponent(eventId)}/tableau`),
  ]);
  return { pools: pools.data, tableau: tableau.rounds };
}

function orient(status: FencerBout["status"], own: number, other: number): FencerBout["score"] {
  return status === "upcoming" ? null : [own, other];
}

function boutsForFencer(fencerId: string, { pools, tableau }: EventBouts): FencerBout[] {
  const poolBouts = [...pools]
    .sort((a, b) => a.number - b.number)
    .flatMap((pool) =>
      [...pool.bouts]
        .sort((a, b) => a.slot - b.slot)
        .filter((bout) => bout.competitor_1_id === fencerId || bout.competitor_2_id === fencerId)
        .map((bout): FencerBout => {
          const first = bout.competitor_1_id === fencerId;
          const opponentId = first ? bout.competitor_2_id : bout.competitor_1_id;
          const opponent = pool.fencers.find((f) => f.competitor_id === opponentId);
          const [own, other] = first
            ? [bout.competitor_1_score, bout.competitor_2_score]
            : [bout.competitor_2_score, bout.competitor_1_score];
          return {
            id: bout.id,
            stage: `Pool ${pool.number}`,
            opponent: opponent ? `${opponent.first_name} ${opponent.last_name}` : "",
            status: bout.status,
            score: orient(bout.status, own, other),
          };
        }),
    );

  const tableauBouts = [...tableau]
    .sort((a, b) => b.size - a.size)
    .flatMap((round) =>
      round.bouts
        .filter((bout) => bout.top.id === fencerId || bout.bottom.id === fencerId)
        .map((bout): FencerBout => {
          const isTop = bout.top.id === fencerId;
          const opponent = isTop ? bout.bottom : bout.top;
          const [own, other] = isTop ? [bout.top_score, bout.bottom_score] : [bout.bottom_score, bout.top_score];
          return {
            id: bout.id,
            stage: tableauRoundName(round.size).boutName,
            opponent: `${opponent.first_name} ${opponent.last_name}`,
            status: bout.status,
            score: orient(bout.status, own ?? 0, other ?? 0),
          };
        }),
    );

  return [...poolBouts, ...tableauBouts];
}

async function fetchFencerBouts(fencers: Competitor[]): Promise<Record<string, FencerBout[]>> {
  const eventIds = [...new Set(fencers.map(({ eventId }) => eventId))];
  const entries = await Promise.all(eventIds.map(async (eventId) => [eventId, await fetchEventBouts(eventId)] as const));
  const byEvent = new Map(entries);

  return Object.fromEntries(fencers.map(({ id, eventId }) => [id, boutsForFencer(id, byEvent.get(eventId)!)]));
}

export { fetchFencerBouts };
