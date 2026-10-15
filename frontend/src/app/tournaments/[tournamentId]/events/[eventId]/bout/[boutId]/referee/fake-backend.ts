import { act } from "@testing-library/react";

import { BoutStatus } from "@/types/bout";

export const BOUT_ID = "b0000000-0000-4000-8000-000000000000";
export const REFEREE_ID = "r0000000-0000-4000-8000-000000000000";
export const ALICE = { id: "c1", firstName: "Alice", lastName: "Chen", team: "Boston FC" };
export const BEN = { id: "c2", firstName: "Ben", lastName: "Ortiz", team: "" };
export const RECORDED_AT = "2026-10-14T12:00:00Z";

export interface StoredScore {
  id: number;
  competitor_id: string;
  points: number;
  revoked: boolean;
  created_at: string;
  created_by?: string;
}

export interface FakeBackend {
  scores: StoredScore[];
  status: BoutStatus;
  refereeId: string | null;
  failNextCreate: boolean;
  failNextEnd: boolean;
  // While set, history responses wait for it, to mimic a slow history fetch.
  historyGate: Promise<void> | null;
  // While true, every request fails as if the network were down.
  offline: boolean;
  // Saves the next touch, then drops the connection before the response arrives.
  loseNextCreateResponse: boolean;
  failHistory: boolean;
}

export interface BackendOptions {
  refereeId?: string | null;
  status?: BoutStatus;
}

export function reply(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body } as unknown as Response;
}

// Mirrors the scoring routes closely enough to check what the referee sees
// against what the server ended up storing.
export function installBackend(
  initial: Pick<StoredScore, "id" | "competitor_id" | "points">[],
  { refereeId = REFEREE_ID, status = "active" }: BackendOptions = {},
) {
  const backend: FakeBackend = {
    scores: initial.map((score) => ({ ...score, revoked: false, created_at: RECORDED_AT })),
    status,
    refereeId,
    failNextCreate: false,
    failNextEnd: false,
    historyGate: null,
    offline: false,
    loseNextCreateResponse: false,
    failHistory: false,
  };
  const boutBody = () => ({
    id: BOUT_ID,
    referee_id: backend.refereeId,
    competitor_1_id: ALICE.id,
    competitor_2_id: BEN.id,
    points_to_win: 5,
    status: backend.status,
  });
  const live = () => backend.scores.filter((score) => !score.revoked);

  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    if (backend.offline) {
      throw new TypeError("Failed to fetch");
    }

    if (url === `/api/v1/bouts/${BOUT_ID}` && init?.method === "PATCH") {
      backend.refereeId = body.referee_id ?? backend.refereeId;
      return reply(200, boutBody());
    }
    if (url === `/api/v1/bouts/${BOUT_ID}`) {
      return reply(200, boutBody());
    }
    if (url === `/api/v1/bouts/${BOUT_ID}/start`) {
      if (backend.status !== "upcoming") {
        return reply(409, { detail: "only an upcoming bout can be started" });
      }
      if (!backend.refereeId) {
        return reply(409, { detail: "a bout needs a referee to start" });
      }
      backend.status = "active";
      return reply(200, boutBody());
    }
    if (url === `/api/v1/bouts/${BOUT_ID}/end`) {
      if (backend.failNextEnd) {
        backend.failNextEnd = false;
        return reply(500, { detail: "could not end bout" });
      }
      if (backend.status !== "active") {
        return reply(409, { detail: "only an active bout can be ended" });
      }
      backend.status = "end";
      return reply(200, boutBody());
    }
    if (url === "/api/v1/bouts/p1") {
      return reply(422, {
        detail: "validation failed",
        errors: [{ location: "path.id", message: "expected string to be RFC 4122 uuid", value: "p1" }],
      });
    }
    if (url === `/api/v1/competitors/${ALICE.id}`) {
      return reply(200, ALICE);
    }
    if (url === `/api/v1/competitors/${BEN.id}`) {
      return reply(200, BEN);
    }
    if (url.startsWith(`/api/v1/scoring/match/${BOUT_ID}/history`)) {
      await backend.historyGate;
      if (backend.failHistory) {
        return reply(500, { detail: "history unavailable" });
      }
      let running: [number, number] = [0, 0];
      // Like the real endpoint: a revoked touch shows the score it produced, but later touches skip it.
      const data = [...backend.scores].sort((a, b) => a.id - b.id).map((score) => {
        const scored: [number, number] = [...running];
        scored[score.competitor_id === ALICE.id ? 0 : 1] += score.points;
        if (!score.revoked) {
          running = scored;
        }
        return {
          id: score.id,
          competitor_id: score.competitor_id,
          points: score.points,
          created_at: score.created_at,
          revoked_at: score.revoked ? RECORDED_AT : null,
          competitor_1_score: scored[0],
          competitor_2_score: scored[1],
        };
      });
      return reply(200, { data: data.reverse() });
    }
    if (url.startsWith(`/api/v1/scoring/match/${BOUT_ID}`)) {
      // The real endpoint returns newest first.
      return reply(200, { data: [...live()].reverse() });
    }
    if (url === "/api/v1/scoring" && init?.method === "POST") {
      if (backend.failNextCreate) {
        backend.failNextCreate = false;
        return reply(500, { detail: "database unavailable" });
      }
      const created = {
        id: Math.max(0, ...backend.scores.map((score) => score.id)) + 1,
        competitor_id: body.competitor_id,
        created_by: body.created_by,
        points: 1,
        revoked: false,
        created_at: RECORDED_AT,
      };
      backend.scores.push(created);
      if (backend.loseNextCreateResponse) {
        backend.loseNextCreateResponse = false;
        backend.offline = true;
        throw new TypeError("Failed to fetch");
      }
      return reply(201, created);
    }
    const revoke = url.match(/^\/api\/v1\/scoring\/(\d+)\/revoke$/);
    if (revoke) {
      const target = backend.scores.find((score) => score.id === Number(revoke[1]));
      if (!target || target.revoked) {
        return reply(409, { detail: "score has already been revoked" });
      }
      target.revoked = true;
      return reply(200, target);
    }
    return reply(404, { detail: "not found" });
  }) as typeof fetch;

  return { backend, live };
}

export async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
