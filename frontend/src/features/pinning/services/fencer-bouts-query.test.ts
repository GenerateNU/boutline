import { fetchFencerBouts } from "@/features/pinning/services/fencer-bouts-query";
import type { Competitor } from "@/types/competitor";

function fencer(id: string): Competitor {
  return { id, eventId: "e1", firstName: id, lastName: "X", rating: "A", ratingYear: null, team: "" };
}

function bout(overrides: Record<string, unknown>) {
  return {
    id: "b1",
    status: "ended",
    pool_id: null,
    pool_number: null,
    round_size: null,
    slot: 1,
    opponent: { id: "o1", first_name: "Jane", last_name: "Doe" },
    score: 5,
    opponent_score: 3,
    ...overrides,
  };
}

describe("fetchFencerBouts", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  function serve(bouts: unknown[]) {
    fetchMock.mockImplementation(async () => ({ ok: true, status: 200, json: async () => ({ data: bouts }) }));
  }

  it.each([
    { case: "a pool bout", bout: bout({ pool_id: "p2", pool_number: 2 }), want: { poolId: "p2", stage: "Pool 2", score: [5, 3] } },
    { case: "a tableau bout", bout: bout({ round_size: 8 }), want: { poolId: null, stage: "Table of 8", score: [5, 3] } },
    { case: "a semi-final", bout: bout({ round_size: 4 }), want: { poolId: null, stage: "Semi-final", score: [5, 3] } },
    {
      case: "an upcoming bout",
      bout: bout({ round_size: 2, status: "upcoming", score: null, opponent_score: null }),
      want: { poolId: null, stage: "Final", score: null },
    },
  ])("maps $case", async ({ bout: served, want }) => {
    serve([served]);

    const bouts = await fetchFencerBouts([fencer("f1")]);

    expect(bouts).toEqual({ f1: [{ id: "b1", opponent: "Jane Doe", status: served.status, ...want }] });
  });

  it("requests each fencer's bouts and keys them by fencer", async () => {
    serve([]);

    const bouts = await fetchFencerBouts([fencer("f1"), fencer("f/2")]);

    expect(bouts).toEqual({ f1: [], "f/2": [] });
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url), "http://localhost").pathname)).toEqual([
      expect.stringMatching(/\/competitors\/f1\/bouts$/),
      expect.stringMatching(/\/competitors\/f%2F2\/bouts$/),
    ]);
  });

  it("makes no request without fencers", async () => {
    expect(await fetchFencerBouts([])).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
