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

  it("forwards a query as the q param when given", async () => {
    const body = { data: [], total: 0, limit: 20, offset: 0 };
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => body });

    await getTournaments(20, 0, { query: "northwestern" });

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedUrl.pathname).toBe("/api/v1/tournaments");
    expect(requestedUrl.searchParams.get("q")).toBe("northwestern");
  });

  it("omits the q param when no query is given", async () => {
    const body = { data: [], total: 0, limit: 20, offset: 0 };
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => body });

    await getTournaments(20, 0);

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedUrl.searchParams.has("q")).toBe(false);
  });

  it("forwards a status filter when given", async () => {
    const body = { data: [], total: 0, limit: 20, offset: 0 };
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => body });

    await getTournaments(20, 0, { status: "active" });

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedUrl.searchParams.get("status")).toBe("active");
  });

  it.each([
    {
      name: "date with a time zone",
      filters: { date: "2026-10-23", timeZone: "America/New_York" },
      expected: {
        start_from: "2026-10-23T04:00:00.000Z",
        start_to: "2026-10-24T04:00:00.000Z",
        visibility: null,
      },
    },
    {
      name: "date without a time zone",
      filters: { date: "2026-10-23" },
      expected: {
        start_from: "2026-10-23T00:00:00.000Z",
        start_to: "2026-10-24T00:00:00.000Z",
        visibility: null,
      },
    },
    {
      name: "no date",
      filters: {},
      expected: { start_from: null, start_to: null, visibility: null },
    },
    {
      name: "public visibility",
      filters: { visibility: "public" as const },
      expected: { start_from: null, start_to: null, visibility: "public" },
    },
  ])("sends the right range and visibility params for $name", async ({ filters, expected }) => {
    const body = { data: [], total: 0, limit: 20, offset: 0 };
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => body });

    await getTournaments(20, 0, filters);

    const { searchParams } = new URL(fetchMock.mock.calls[0][0] as string);
    expect(searchParams.get("start_from")).toBe(expected.start_from);
    expect(searchParams.get("start_to")).toBe(expected.start_to);
    expect(searchParams.get("visibility")).toBe(expected.visibility);
  });

  it("throws when the backend responds with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getTournaments(20, 0)).rejects.toThrow("list tournaments: 500");
  });
});
