import { getTournaments } from "@/features/tournament/services/getTournaments";

describe("getTournaments", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it("requests the given page and returns the parsed body", async () => {
    const body = { data: [], total: 0, limit: 20, offset: 0 };
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => body });

    const result = await getTournaments(20, 0);

    expect(result).toEqual(body);
    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedUrl.pathname).toBe("/api/v1/tournaments");
    expect(requestedUrl.searchParams.get("limit")).toBe("20");
    expect(requestedUrl.searchParams.get("offset")).toBe("0");
  });

  it("throws when the backend responds with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getTournaments(20, 0)).rejects.toThrow("list tournaments: 500");
  });
});
