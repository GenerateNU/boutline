import { act, renderHook, waitFor } from "@testing-library/react";

import { BoutStatus } from "@/types/bout";

import { ALICE, BEN, BOUT_ID, installBackend, settle } from "../fake-backend";

import { useMatchup } from "./use-matchup";
import { useScoreHistory } from "./use-score-history";
import { useScoringActions } from "./use-scoring-actions";

function useHarness() {
  const { history, refreshHistory } = useScoreHistory(BOUT_ID);
  const { matchup, scores, confirmed, setConfirmed, setBout } = useMatchup(BOUT_ID, refreshHistory);
  const queue = useScoringActions({ boutId: BOUT_ID, matchup, confirmed, setConfirmed, setBout, refreshHistory });
  return { history, matchup, scores, ...queue };
}

async function load(initial: Parameters<typeof installBackend>[0], status: BoutStatus = "active") {
  const installed = installBackend(initial, { status });
  const hook = renderHook(useHarness);
  await waitFor(() => expect(hook.result.current.matchup).not.toBeNull());
  return { ...installed, ...hook };
}

describe("useScoringActions", () => {
  it("runs actions in tap order and refreshes the history after each", async () => {
    const { result, live } = await load([]);

    act(() => {
      result.current.submit({ kind: "touch", competitorId: BEN.id });
      result.current.submit({ kind: "touch", competitorId: ALICE.id });
    });
    expect(result.current.pending).toHaveLength(2);
    await settle();

    expect(live().map((score) => score.competitor_id)).toEqual([BEN.id, ALICE.id]);
    expect(result.current.scores.map((score) => score.competitor_id)).toEqual([BEN.id, ALICE.id]);
    expect(result.current.history.map((entry) => entry.competitor_id)).toEqual([ALICE.id, BEN.id]);
    expect(result.current.pending).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.scoreVersion).toBe(2);
  });

  it.each([
    { name: "ascending ids", ids: [1, 2, 3], revoked: 3 },
    { name: "descending ids", ids: [3, 2, 1], revoked: 3 },
    { name: "scrambled ids", ids: [2, 9, 4], revoked: 9 },
  ])("undo revokes the highest-id score with $name", async ({ ids, revoked }) => {
    const { result, backend } = await load(ids.map((id) => ({ id, competitor_id: ALICE.id, points: 1 })));

    act(() => result.current.submit({ kind: "undo" }));
    await settle();

    expect(backend.scores.filter((score) => score.revoked).map((score) => score.id)).toEqual([revoked]);
    expect(result.current.scores).toHaveLength(2);
    const revokedInHistory = result.current.history
      .filter((entry) => entry.revoked_at !== null)
      .map((entry) => entry.id);
    expect(result.current.history).toHaveLength(3);
    expect(revokedInHistory).toEqual([revoked]);
  });

  it("a failure drops the actions queued behind it, reloads from the server and exposes the error", async () => {
    const { result, backend, live } = await load([{ id: 1, competitor_id: BEN.id, points: 1 }]);

    backend.failNextCreate = true;
    act(() => {
      result.current.submit({ kind: "touch", competitorId: ALICE.id });
      result.current.submit({ kind: "undo" });
    });
    await settle();

    expect(result.current.error).toBe("database unavailable");
    expect(result.current.pending).toEqual([]);
    expect(result.current.scores.map((score) => score.id)).toEqual([1]);
    expect(result.current.history.map((entry) => entry.id)).toEqual([1]);
    expect(live()).toHaveLength(1);
    expect(result.current.scoreVersion).toBe(4);
  });

  it("starts an upcoming bout", async () => {
    const { result, backend } = await load([], "upcoming");

    act(() => result.current.submit({ kind: "start" }));
    await settle();

    expect(backend.status).toBe("active");
    expect(result.current.matchup?.bout.status).toBe("active");
  });

  it("ends an active bout whose score is unchanged", async () => {
    const { result, backend } = await load([{ id: 1, competitor_id: ALICE.id, points: 1 }]);

    act(() => result.current.submit({ kind: "end", touchCount: 1 }));
    await settle();

    expect(backend.status).toBe("ended");
    expect(result.current.matchup?.bout.status).toBe("ended");
    expect(result.current.error).toBeNull();
  });

  it("refuses to end against a score the fencers did not see", async () => {
    const { result, backend } = await load([{ id: 1, competitor_id: ALICE.id, points: 1 }]);

    act(() => result.current.submit({ kind: "end", touchCount: 2 }));
    await settle();

    expect(result.current.error).toBe("The score changed before the bout could end");
    expect(backend.status).toBe("active");
  });

  it("surfaces an end failure and bumps the score version", async () => {
    const { result, backend } = await load([{ id: 1, competitor_id: ALICE.id, points: 1 }]);

    backend.failNextEnd = true;
    act(() => result.current.submit({ kind: "end", touchCount: 1 }));
    await settle();

    expect(result.current.error).toBe("could not end bout");
    expect(result.current.scoreVersion).toBe(2);
    expect(result.current.matchup?.bout.status).toBe("active");
    expect(backend.status).toBe("active");
  });
});
