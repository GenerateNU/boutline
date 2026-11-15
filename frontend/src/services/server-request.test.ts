import { ApiError } from "./api-request";
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

  it("throws an ApiError with the status when the backend responds with an error", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    const request = serverRequest("/events/missing/tableau");

    await expect(request).rejects.toThrow("Request failed with status 404");
    await expect(request).rejects.toMatchObject({ status: 404 });
    await expect(request).rejects.toBeInstanceOf(ApiError);
  });

  it("sets the given params and leaves out unset and empty ones", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    await serverRequest("/competitors", {
      params: { tournament_id: "t-1", limit: 20, q: undefined, team: "" },
    });

    expect(new URL(fetchMock.mock.calls[0][0]).search).toBe("?tournament_id=t-1&limit=20");
  });

  const tokenCases = [
    { name: "sends the token as a bearer header", token: "tok", headers: { Authorization: "Bearer tok" } },
    { name: "sends no auth header without a token", token: undefined, headers: undefined },
  ];

  it.each(tokenCases)("$name", async ({ token, headers }) => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    await serverRequest("/tournaments/t1/role", { token });

    expect(fetchMock.mock.calls[0][1].headers).toEqual(headers);
  });
});
