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
    const body = { id: "e1", name: "Senior Men's Foil" };
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => body });

    const result = await getEvent("e1");

    expect(result).toEqual(body);
    expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toBe("/api/v1/events/e1");
  });

  it.each([
    { name: "an unknown event", status: 404 },
    { name: "an id that isn't a UUID", status: 422 },
  ])("resolves null for $name", async ({ status }) => {
    fetchMock.mockResolvedValue({ ok: false, status });

    await expect(getEvent("e1")).resolves.toBeNull();
  });

  it("throws on any other error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getEvent("e1")).rejects.toThrow("Request failed with status 500");
  });

  it("rejects when the given signal aborts a stalled request", async () => {
    // A fetch that never answers on its own, only rejecting when aborted, as a real fetch does.
    fetchMock.mockImplementation(
      (_url: URL, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const controller = new AbortController();

    const request = getEvent("e1", controller.signal);
    controller.abort(new DOMException("timed out", "TimeoutError"));

    await expect(request).rejects.toThrow("timed out");
  });
});
