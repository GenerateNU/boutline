import { serverRequest } from "./server-request";

const fetchMock = jest.fn();

beforeEach(() => {
  global.fetch = fetchMock;
});

afterEach(() => {
  fetchMock.mockReset();
});

describe("serverRequest", () => {
  it("fetches the path under /api/v1 without caching and returns the parsed body", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: "e-1" }) });

    await expect(serverRequest("/events/e-1/tableau")).resolves.toEqual({ id: "e-1" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(url).pathname).toBe("/api/v1/events/e-1/tableau");
    expect(init).toEqual({ cache: "no-store" });
  });

  it("throws with the status when the backend responds with an error", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    await expect(serverRequest("/events/missing/tableau")).rejects.toThrow(
      "Request failed with status 404",
    );
  });
});
