import { act, renderHook } from "@testing-library/react";

import { ScoringHistoryEntry } from "@/types/scoring";

import { useScoreHistory } from "./use-score-history";

const entry = (id: number): ScoringHistoryEntry => ({
  id,
  competitor_id: "c1",
  points: 1,
  created_at: "2026-10-14T12:00:00Z",
  revoked_at: null,
  competitor_1_score: id,
  competitor_2_score: 0,
});

describe("useScoreHistory", () => {
  it.each([
    { name: "responses resolving in order", resolveOrder: [0, 1] },
    { name: "responses resolving in reverse", resolveOrder: [1, 0] },
  ])("ends with the second request's data for $name", async ({ resolveOrder }) => {
    const resolvers: ((entries: ScoringHistoryEntry[]) => void)[] = [];
    const responses = [[entry(1)], [entry(1), entry(2)]];
    global.fetch = jest.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolvers.push((data) =>
            resolve({ ok: true, status: 200, json: async () => ({ data }) } as Response),
          );
        }),
    ) as typeof fetch;

    const { result } = renderHook(() => useScoreHistory("bout"));
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.refreshHistory();
      second = result.current.refreshHistory();
    });

    await act(async () => {
      for (const index of resolveOrder) {
        resolvers[index](responses[index]);
      }
      await Promise.all([first, second]);
    });

    expect(result.current.history).toEqual(responses[1]);
  });
});
