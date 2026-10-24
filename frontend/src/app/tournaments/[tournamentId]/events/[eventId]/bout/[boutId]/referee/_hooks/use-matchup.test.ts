import { renderHook, waitFor } from "@testing-library/react";

import { ALICE, BEN, BOUT_ID, installBackend } from "../fake-backend";

import { useMatchup } from "./use-matchup";

const refreshHistory = async () => {};
const failingHistory = async () => {
  throw new Error("history unavailable");
};

describe("useMatchup", () => {
  it("loads the matchup with scores oldest first even though the server lists newest first", async () => {
    installBackend([
      { id: 3, competitor_id: ALICE.id, points: 1 },
      { id: 1, competitor_id: BEN.id, points: 1 },
      { id: 2, competitor_id: ALICE.id, points: 1 },
    ]);

    const { result } = renderHook(() => useMatchup(BOUT_ID, refreshHistory));
    await waitFor(() => expect(result.current.matchup).not.toBeNull());

    expect(result.current.scores.map((score) => score.id)).toEqual([1, 2, 3]);
    expect(result.current.confirmed.current.map((score) => score.id)).toEqual([1, 2, 3]);
    expect(result.current.matchup?.competitors.map((competitor) => competitor.id)).toEqual([ALICE.id, BEN.id]);
    expect(result.current.loadError).toBeNull();
  });

  it("reports the failing field when the bout id is rejected", async () => {
    installBackend([]);

    const { result } = renderHook(() => useMatchup("p1", refreshHistory));

    await waitFor(() =>
      expect(result.current.loadError).toBe(
        "validation failed (path.id: expected string to be RFC 4122 uuid)",
      ),
    );
    expect(result.current.matchup).toBeNull();
  });

  it("still loads the scoreboard when the history fails", async () => {
    installBackend([{ id: 1, competitor_id: ALICE.id, points: 1 }]);

    const { result } = renderHook(() => useMatchup(BOUT_ID, failingHistory));
    await waitFor(() => expect(result.current.matchup).not.toBeNull());

    expect(result.current.scores.map((score) => score.id)).toEqual([1]);
    expect(result.current.loadError).toBeNull();
  });
});
