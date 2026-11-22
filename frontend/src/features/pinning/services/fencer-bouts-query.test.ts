import { fetchFencerBouts } from "@/features/pinning/services/fencer-bouts-query";
import { Competitor } from "@/types/competitor";

function fencer(id: string, eventId = "e1"): Competitor {
  return { id, eventId, firstName: id, lastName: "X", rating: "A", ratingYear: null, team: "" };
}

function poolFencer(id: string, first: string) {
  return { competitor_id: id, first_name: first, last_name: "Opp" };
}

function poolBout(id: string, slot: number, c1: string, c2: string, s1: number, s2: number, status = "ended") {
  return { id, slot, status, competitor_1_id: c1, competitor_2_id: c2, competitor_1_score: s1, competitor_2_score: s2 };
}

function tableauFencer(id: string, first: string) {
  return { id, first_name: first, last_name: "Opp" };
}

function tableauBout(id: string, top: string, bottom: string, topScore: number | null, bottomScore: number | null, status = "ended") {
  return {
    id,
    slot: 1,
    status,
    top: tableauFencer(top, top === "f1" ? "Me" : "Top"),
    bottom: tableauFencer(bottom, bottom === "f1" ? "Me" : "Bottom"),
    top_score: topScore,
    bottom_score: bottomScore,
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

  function serve(pools: unknown[], rounds: unknown[]) {
    fetchMock.mockImplementation(async (input: string) => {
      const { pathname } = new URL(input, "http://localhost");
      const body = pathname.endsWith("/pool-sheets")
        ? { data: pools, total: pools.length, limit: 100, offset: 0 }
        : { rounds };
      return { ok: true, status: 200, json: async () => body };
    });
  }

  const POOL = {
    number: 2,
    fencers: [poolFencer("f1", "Me"), poolFencer("f2", "Ann"), poolFencer("f3", "Bo")],
    bouts: [poolBout("b2", 2, "f3", "f1", 1, 5), poolBout("b1", 1, "f1", "f2", 5, 3)],
  };

  it("orients pool scores to the pinned fencer and orders by slot", async () => {
    serve([POOL], []);

    const { f1 } = await fetchFencerBouts([fencer("f1")]);

    expect(f1).toEqual([
      { id: "b1", stage: "Pool 2", opponent: "Ann Opp", status: "ended", score: [5, 3] },
      { id: "b2", stage: "Pool 2", opponent: "Bo Opp", status: "ended", score: [5, 1] },
    ]);
  });

  it.each([
    ["top", tableauBout("t", "f1", "f9", 15, 10), [15, 10], "Bottom Opp"],
    ["bottom", tableauBout("t", "f9", "f1", 10, 15), [15, 10], "Top Opp"],
  ])("orients a tableau bout where the fencer is %s", async (_, bout, score, opponent) => {
    serve([], [{ size: 16, bouts: [bout] }]);

    const { f1 } = await fetchFencerBouts([fencer("f1")]);

    expect(f1).toEqual([{ id: "t", stage: "Table of 16", opponent, status: "ended", score }]);
  });

  it("returns no bouts for an undrawn tableau and a fencer outside every pool", async () => {
    serve([POOL], []);

    expect(await fetchFencerBouts([fencer("f9")])).toEqual({ f9: [] });
  });

  it("lists pool bouts by pool number, then tableau rounds from largest to smallest", async () => {
    serve(
      [
        { ...POOL, number: 3, bouts: [poolBout("p3", 1, "f1", "f2", 5, 0)] },
        { ...POOL, number: 1, bouts: [poolBout("p1", 1, "f1", "f2", 5, 0)] },
      ],
      [
        { size: 2, bouts: [tableauBout("final", "f1", "f9", 15, 0)] },
        { size: 16, bouts: [tableauBout("t16", "f1", "f9", 15, 0)] },
        { size: 4, bouts: [tableauBout("semi", "f1", "f9", 15, 0)] },
      ],
    );

    const { f1 } = await fetchFencerBouts([fencer("f1")]);

    expect(f1.map(({ id, stage }) => [id, stage])).toEqual([
      ["p1", "Pool 1"],
      ["p3", "Pool 3"],
      ["t16", "Table of 16"],
      ["semi", "Semi-final"],
      ["final", "Final"],
    ]);
  });

  it("has no score for upcoming bouts", async () => {
    serve(
      [{ ...POOL, bouts: [poolBout("b1", 1, "f1", "f2", 0, 0, "upcoming")] }],
      [{ size: 8, bouts: [tableauBout("t", "f1", "f9", null, null, "upcoming")] }],
    );

    const { f1 } = await fetchFencerBouts([fencer("f1")]);

    expect(f1.map(({ score }) => score)).toEqual([null, null]);
  });

  it("makes two requests for two fencers in the same event", async () => {
    serve([POOL], []);

    const result = await fetchFencerBouts([fencer("f1"), fencer("f2")]);

    expect(Object.keys(result)).toEqual(["f1", "f2"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("makes no request without fencers", async () => {
    expect(await fetchFencerBouts([])).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
