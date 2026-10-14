import { renderHook, waitFor } from "@testing-library/react";

import { ALICE, BEN, BOUT_ID, installBackend } from "../fake-backend";

import { useBoard } from "./use-board";

const refreshHistory = async () => {};
const failingHistory = async () => {
  throw new Error("history unavailable");
};

describe("useBoard", () => {
  it("loads the board with scores in ascending id even though the server lists newest first", async () => {
    installBackend([
      { id: 3, competitor_id: ALICE.id, points: 1 },
      { id: 1, competitor_id: BEN.id, points: 1 },
      { id: 2, competitor_id: ALICE.id, points: 1 },
    ]);

    const { result } = renderHook(() => useBoard(BOUT_ID, refreshHistory));
    await waitFor(() => expect(result.current.board).not.toBeNull());

    expect(result.current.scores.map((score) => score.id)).toEqual([1, 2, 3]);
    expect(result.current.confirmed.current.map((score) => score.id)).toEqual([1, 2, 3]);
    expect(result.current.board?.competitors.map((competitor) => competitor.id)).toEqual([ALICE.id, BEN.id]);
    expect(result.current.loadError).toBeNull();
  });

  it("reports the failing field when the bout id is rejected", async () => {
    installBackend([]);

    const { result } = renderHook(() => useBoard("p1", refreshHistory));

    await waitFor(() =>
      expect(result.current.loadError).toBe(
        "validation failed (path.id: expected string to be RFC 4122 uuid)",
      ),
    );
    expect(result.current.board).toBeNull();
  });

  it("reports a history failure as a load error", async () => {
    installBackend([]);

    const { result } = renderHook(() => useBoard(BOUT_ID, failingHistory));

    await waitFor(() => expect(result.current.loadError).toBe("history unavailable"));
  });
});
