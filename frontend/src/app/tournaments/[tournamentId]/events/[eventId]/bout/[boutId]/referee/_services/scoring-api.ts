import { apiRequest } from "@/services/api-request";
import type { Bout } from "@/types/bout";
import type { Competitor } from "@/types/competitor";
import type { Scoring } from "@/types/scoring";

function getBout(boutId: string) {
  return apiRequest<Bout>(`/bouts/${boutId}`);
}

function endBout(boutId: string) {
  return apiRequest<Bout>(`/bouts/${boutId}/end`, { method: "POST" });
}

function getCompetitor(competitorId: string) {
  return apiRequest<Competitor>(`/competitors/${competitorId}`);
}

// A bout has at most a few dozen live touches, so one maximum-size page holds all of them.
async function listScoring(boutId: string) {
  const { data } = await apiRequest<{ data: Scoring[] }>(`/scoring/match/${boutId}?limit=100`);
  return data;
}

function createScoring(boutId: string, competitorId: string, createdBy: string) {
  return apiRequest<Scoring>("/scoring", {
    method: "POST",
    body: JSON.stringify({ bout_id: boutId, competitor_id: competitorId, created_by: createdBy }),
  });
}

function revokeScoring(scoringId: number, revokedBy: string) {
  return apiRequest<Scoring>(`/scoring/${scoringId}/revoke`, {
    method: "POST",
    body: JSON.stringify({ revoked_by: revokedBy }),
  });
}

export {
  createScoring,
  endBout,
  getBout,
  getCompetitor,
  listScoring,
  revokeScoring,
};
