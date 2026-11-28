import { MAX_FENCERS_PER_POOL } from "@/features/pool/lib/pool-limits";
import { stripBody } from "@/features/pool/lib/pool-strip";
import { apiRequest } from "@/services/api-request";


interface CreatePoolInput {
  eventId: string;
  poolStageId: string | null;
  number: number;
  strip: string;
  fencerIds: string[];
}

export async function createPool({ eventId, poolStageId, number, strip, fencerIds }: CreatePoolInput) {
  let stageId = poolStageId;
  if (stageId === null) {
    const stage = await apiRequest<{ id: string }>("/pool-stages", {
      method: "POST",
      body: JSON.stringify({ event_id: eventId, max_competitor_per_pool: MAX_FENCERS_PER_POOL }),
    });
    stageId = stage.id;
  }
  await apiRequest("/pools", {
    method: "POST",
    body: JSON.stringify({
      pools: [{ pool_stage_id: stageId, number, strip: stripBody(strip), fencers: fencerIds }],
    }),
  });
}
