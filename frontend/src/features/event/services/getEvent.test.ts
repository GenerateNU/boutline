import { getEvent } from "@/features/event/services/getEvent";

describe("getEvent", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it("requests the event by id and returns the parsed body", async () => {
    const body = { id: "c1", name: "Mixed Épée" };
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => body });

    const result = await getEvent("c1");

    expect(result).toEqual(body);
    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedUrl.pathname).toBe("/api/v1/events/c1");
  });

  it.each([404, 422])("returns null when the backend responds %i", async (status) => {
    fetchMock.mockResolvedValue({ ok: false, status });

    await expect(getEvent("missing")).resolves.toBeNull();
  });

  it("throws on any other error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getEvent("c1")).rejects.toThrow("get event: 500");
  });
});
