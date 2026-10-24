import { getEvents } from "@/features/event/services/getEvents";

describe("getEvents", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it("requests the tournament's events and returns the parsed body", async () => {
    const body = { data: [], total: 0, limit: 100, offset: 0 };
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => body });

    const result = await getEvents("t1");

    expect(result).toEqual(body);
    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedUrl.pathname).toBe("/api/v1/events");
    expect(requestedUrl.searchParams.get("tournament_id")).toBe("t1");
    expect(requestedUrl.searchParams.get("limit")).toBe("100");
  });

  it("throws when the backend responds with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getEvents("t1")).rejects.toThrow("list events: 500");
  });
});
