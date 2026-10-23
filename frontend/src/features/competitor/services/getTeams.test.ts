import { getTeams } from "@/features/competitor/services/getTeams";

describe("getTeams", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it("puts the tournament in the path, not the query", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [], total: 0, limit: 20, offset: 0 }),
    });

    await getTeams("t-1", 20, 0, "allez");

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/api/v1/tournaments/t-1/teams");
    expect(url.searchParams.has("tournament_id")).toBe(false);
    expect(url.searchParams.get("q")).toBe("allez");
  });

  it("throws when the backend responds with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getTeams("t-1", 20, 0)).rejects.toThrow("list teams: 500");
  });
});
