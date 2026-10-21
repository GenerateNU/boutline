import { apiRequest } from "@/services/api-request";
import { Bout } from "@/types/bout";
import { Competitor } from "@/types/competitor";
import { Scoring, ScoringHistoryResponse } from "@/types/scoring";

import { Matchup } from "../_types/matchup";

export function getBout(boutId: string) {
  return apiRequest<Bout>(`/bouts/${boutId}`);
}

export function startBout(boutId: string) {
  return apiRequest<Bout>(`/bouts/${boutId}/start`, { method: "POST" });
}

export function assignReferee(boutId: string, refereeId: string) {
  return apiRequest<Bout>(`/bouts/${boutId}`, {
    method: "PATCH",
    body: JSON.stringify({ referee_id: refereeId }),
  });
}

export function endBout(boutId: string) {
  return apiRequest<Bout>(`/bouts/${boutId}/end`, { method: "POST" });
}

export function getCompetitor(competitorId: string) {
  return apiRequest<Competitor>(`/competitors/${competitorId}`);
}

export async function getMatchup(boutId: string): Promise<Matchup> {
  const bout = await getBout(boutId);
  const competitors = await Promise.all([
    getCompetitor(bout.competitor_1_id),
    getCompetitor(bout.competitor_2_id),
  ]);
  return { bout, competitors };
}

// A bout has at most a few dozen live touches, so one maximum-size page holds all of them.
export async function listScoring(boutId: string) {
  const { data } = await apiRequest<{ data: Scoring[] }>(`/scoring/match/${boutId}?limit=100`);
  return data;
}

export async function getScoringHistory(boutId: string) {
  const { data } = await apiRequest<ScoringHistoryResponse>(`/scoring/match/${boutId}/history`);
  return data;
}

export function createScoring(boutId: string, competitorId: string, createdBy: string) {
  return apiRequest<Scoring>("/scoring", {
    method: "POST",
    body: JSON.stringify({ bout_id: boutId, competitor_id: competitorId, created_by: createdBy }),
  });
}

export function revokeScoring(scoringId: number, revokedBy: string) {
  return apiRequest<Scoring>(`/scoring/${scoringId}/revoke`, {
    method: "POST",
    body: JSON.stringify({ revoked_by: revokedBy }),
  });
}
