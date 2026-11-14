import { getReferees } from "@/features/referee/services/getReferees";

describe("getReferees", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it.each([
    {
      name: "without a search",
      limit: 20,
      offset: 0,
      query: undefined,
      expected: "/api/v1/tournaments/t-1/users?role=referee&limit=20&offset=0",
    },
    {
      name: "with a search",
      limit: 10,
      offset: 30,
      query: "ana",
      expected: "/api/v1/tournaments/t-1/users?role=referee&limit=10&offset=30&q=ana",
    },
  ])("builds the URL $name", async ({ limit, offset, query, expected }) => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [], total: 0, limit: 20, offset: 0 }),
    });

    await getReferees("t-1", limit, offset, query);

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname + url.search).toBe(expected);
  });

  it("throws when the backend responds with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getReferees("t-1", 20, 0)).rejects.toThrow("list referees: 500");
  });
});
