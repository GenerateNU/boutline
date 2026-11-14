import { apiRequest } from "./api-request";

function respondWith(status: number, body: unknown) {
  global.fetch = jest.fn(async () => ({
    ok: status < 400,
    status,
    json: async () => (body === undefined ? Promise.reject(new SyntaxError("no body")) : body),
  })) as unknown as typeof fetch;
}

// A fetch that never answers, and rejects once its signal aborts, like a hung connection.
function hangUntilAborted() {
  global.fetch = jest.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      }),
  ) as unknown as typeof fetch;
}

describe("apiRequest", () => {
  it("returns the parsed body on success", async () => {
    respondWith(200, { id: "b1" });

    await expect(apiRequest("/bouts/b1")).resolves.toEqual({ id: "b1" });
  });

  it.each([
    {
      name: "a Huma validation error names each failing field",
      status: 422,
      body: {
        detail: "validation failed",
        errors: [
          { location: "path.id", message: "expected string to be RFC 4122 uuid" },
          { location: "body.points", message: "expected number >= 1" },
        ],
      },
      message:
        "validation failed (path.id: expected string to be RFC 4122 uuid; body.points: expected number >= 1)",
    },
    {
      name: "a detail without field errors is used as is",
      status: 409,
      body: { detail: "score has already been revoked" },
      message: "score has already been revoked",
    },
    {
      name: "a response without a JSON body falls back to the status",
      status: 502,
      body: undefined,
      message: "Request failed with status 502",
    },
  ])("rejects when $name", async ({ status, body, message }) => {
    respondWith(status, body);

    await expect(apiRequest("/anything")).rejects.toThrow(message);
  });

  it.each<{ name: string; headers: HeadersInit | undefined; expected: Record<string, string> }>([
    { name: "no headers", headers: undefined, expected: { "content-type": "application/json" } },
    {
      name: "a plain object",
      headers: { Authorization: "Bearer t" },
      expected: { authorization: "Bearer t", "content-type": "application/json" },
    },
    {
      name: "a Headers instance",
      headers: new Headers({ Authorization: "Bearer t" }),
      expected: { authorization: "Bearer t", "content-type": "application/json" },
    },
    {
      name: "an entry list",
      headers: [["Accept", "text/plain"]],
      expected: { accept: "text/plain", "content-type": "application/json" },
    },
    { name: "its own Content-Type", headers: { "Content-Type": "text/csv" }, expected: { "content-type": "text/csv" } },
  ])("keeps the caller's headers given as $name", async ({ headers, expected }) => {
    respondWith(200, {});

    await apiRequest("/anything", { headers });

    const sent = (global.fetch as jest.Mock).mock.calls[0][1].headers as Headers;
    expect(Object.fromEntries(sent.entries())).toEqual(expected);
  });

  it("gives up on a hung request after the timeout", async () => {
    jest.useFakeTimers();
    hangUntilAborted();

    const request = apiRequest("/anything");
    jest.advanceTimersByTime(10_000);

    await expect(request).rejects.toThrow("The server took too long to respond");
    jest.useRealTimers();
  });

  it("gives up when the response body stalls past the timeout", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => ({
      ok: true,
      status: 200,
      json: () =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    })) as unknown as typeof fetch;

    const rejected = expect(apiRequest("/anything")).rejects.toThrow("The server took too long to respond");
    await jest.advanceTimersByTimeAsync(10_000);

    await rejected;
    jest.useRealTimers();
  });

  it("uses the caller's signal instead of the timeout", async () => {
    hangUntilAborted();
    const controller = new AbortController();

    const request = apiRequest("/anything", { signal: controller.signal });
    controller.abort(new Error("cancelled"));

    await expect(request).rejects.toThrow("cancelled");
  });
});
