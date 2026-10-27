import { getFencerPool } from "@/features/pool/services/getFencerPool";

function list(data: unknown[]) {
  return { ok: true, status: 200, json: async () => ({ data, total: data.length, limit: 100, offset: 0 }) };
}

const pool = (id: string) => ({
  id,
  pool_stage_id: "s1",
  started_at: "2026-10-01T09:00:00Z",
  completed_at: null,
  created_at: "2026-10-01T00:00:00Z",
});

const bout = (left: string, right: string) => ({
  id: `${left}-${right}`,
  referee_id: null,
  competitor_1_id: left,
  competitor_2_id: right,
  points_to_win: 5,
  status: "upcoming",
  pool_id: null,
  location: "Strip 4",
});

describe("getFencerPool", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  // Routes each request by path, the way the backend would answer it.
  function serve(stages: unknown[], pools: unknown[], boutsByPool: Record<string, unknown[]>) {
    fetchMock.mockImplementation(async (url: URL) => {
      if (url.pathname === "/api/v1/pool-stages") {
        return list(stages);
      }
      if (url.pathname === "/api/v1/pools") {
        return list(pools);
      }
      return list(boutsByPool[url.searchParams.get("pool_id") ?? ""] ?? []);
    });
  }

  it.each([
    {
      name: "the fencer's pool, strip, status, and size",
      stages: [{ id: "s1", event_id: "e1" }],
      competitorId: "hana",
      want: { poolNumber: 2, strip: "4", status: "in_progress", fencerCount: 2 },
    },
    {
      name: "null when the fencer is in no pool",
      stages: [{ id: "s1", event_id: "e1" }],
      competitorId: "ethan",
      want: null,
    },
    { name: "null when the event has no pool stage", stages: [], competitorId: "hana", want: null },
  ])("returns $name", async ({ stages, competitorId, want }) => {
    serve(stages, [pool("p1"), pool("p2")], { p1: [bout("maya", "liam")], p2: [bout("hana", "noah")] });

    expect(await getFencerPool("e1", competitorId)).toEqual(want);
  });

  it("asks for the event's pool stages", async () => {
    serve([], [], {});

    await getFencerPool("e1", "hana");

    const url: URL = fetchMock.mock.calls[0][0];
    expect(url.searchParams.get("event_id")).toBe("e1");
  });

  it("throws when the backend responds with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getFencerPool("e1", "hana")).rejects.toThrow("500");
  });
});
