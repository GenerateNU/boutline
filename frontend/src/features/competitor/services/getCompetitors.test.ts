import { getCompetitors } from "@/features/competitor/services/getCompetitors";

describe("getCompetitors", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [], total: 0, limit: 20, offset: 0 }),
    });
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it.each([
    { name: "no query", query: undefined, wantQuery: null },
    { name: "an empty query", query: "", wantQuery: null },
    { name: "a query", query: "chen", wantQuery: "chen" },
  ])("requests the tournament's page with $name", async ({ query, wantQuery }) => {
    await getCompetitors("t-1", 20, 40, query);

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/api/v1/competitors");
    expect(url.searchParams.get("tournament_id")).toBe("t-1");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(url.searchParams.get("offset")).toBe("40");
    expect(url.searchParams.get("q")).toBe(wantQuery);
  });

  it("throws when the backend responds with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getCompetitors("t-1", 20, 0)).rejects.toThrow("list competitors: 500");
  });
});
