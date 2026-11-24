import { fetchFencerBouts } from "@/features/pinning/services/fencer-bouts-query";

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
    {
      case: "a pool bout",
      bout: bout({ pool_id: "p2", pool_number: 2 }),
      want: { poolId: "p2", stage: "Pool 2", score: [5, 3] },
    },
    { case: "a tableau bout", bout: bout({ round_size: 8 }), want: { poolId: null, stage: "Table of 8", score: [5, 3] } },
    { case: "a semi-final", bout: bout({ round_size: 4 }), want: { poolId: null, stage: "Semi-final", score: [5, 3] } },
    {
      case: "an upcoming bout",
      bout: bout({ round_size: 2, status: "upcoming", score: null, opponent_score: null }),
      want: { poolId: null, stage: "Final", score: null },
    },
  ])("maps $case", async ({ bout: served, want }) => {
    serve([served]);

    expect(await fetchFencerBouts("f1")).toEqual([{ id: "b1", opponent: "Jane Doe", status: served.status, ...want }]);
  });

  it("requests that fencer's bouts by their encoded id", async () => {
    serve([]);

    expect(await fetchFencerBouts("f/2")).toEqual([]);
    expect(new URL(String(fetchMock.mock.calls[0][0]), "http://localhost").pathname).toMatch(
      /\/competitors\/f%2F2\/bouts$/,
    );
  });
});
