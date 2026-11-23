import { getPoolStageResults } from "./get-pool-stage-results";

describe("getPoolStageResults", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it("returns every page of the event's results", async () => {
    fetchMock.mockImplementation(async (url: URL) => {
      const offset = Number(url.searchParams.get("offset"));
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [{ competitor_id: `c${offset}` }], total: 101, limit: 100, offset }),
      };
    });

    const results = await getPoolStageResults("e1");

    expect(results.map(({ competitor_id }) => competitor_id)).toEqual(["c0", "c100"]);
    for (const [url] of fetchMock.mock.calls) {
      expect(new URL(url).pathname).toBe("/api/v1/events/e1/pool-stage-results");
      expect(new URL(url).searchParams.get("limit")).toBe("100");
    }
  });

  it("throws when the backend responds with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    await expect(getPoolStageResults("e1")).rejects.toThrow("Request failed with status 404");
  });
});
