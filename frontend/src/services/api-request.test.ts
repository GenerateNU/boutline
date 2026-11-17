import { ApiError, apiRequest, onUnauthorized } from "./api-request";

function respondWith(status: number, body: unknown) {
  global.fetch = jest.fn(async () => ({
    ok: status < 400,
    status,
    json: async () => (body === undefined ? Promise.reject(new SyntaxError("no body")) : body),
  })) as unknown as typeof fetch;
}

describe("apiRequest", () => {
  it("returns the parsed body on success", async () => {
    respondWith(200, { id: "b1" });

    await expect(apiRequest("/bouts/b1")).resolves.toEqual({ id: "b1" });
  });

  it("resolves to undefined on a 204 with no body", async () => {
    respondWith(204, undefined);

    await expect(apiRequest("/competitors/c1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("rejects with the response status on the error", async () => {
    respondWith(404, { detail: "not found" });

    await expect(apiRequest("/events/e1")).rejects.toMatchObject({
      status: 404,
      message: "not found",
    });
    await expect(apiRequest("/events/e1")).rejects.toBeInstanceOf(ApiError);
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
    await expect(apiRequest("/anything")).rejects.toMatchObject({ status });
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

  describe("onUnauthorized", () => {
    it.each([
      { status: 401, calls: 1 },
      { status: 403, calls: 0 },
      { status: 404, calls: 0 },
      { status: 500, calls: 0 },
      { status: 200, calls: 0 },
    ])("runs the handler $calls time(s) on a $status", async ({ status, calls }) => {
      const handler = jest.fn();
      const unregister = onUnauthorized(handler);
      respondWith(status, {});

      await apiRequest("/anything").catch(() => undefined);

      expect(handler).toHaveBeenCalledTimes(calls);
      unregister();
    });

    it("still rejects with the 401 ApiError", async () => {
      const unregister = onUnauthorized(jest.fn());
      respondWith(401, { detail: "unauthorized" });

      await expect(apiRequest("/auth/me")).rejects.toMatchObject({ status: 401 });
      await expect(apiRequest("/auth/me")).rejects.toBeInstanceOf(ApiError);
      unregister();
    });

    it("stops running once unregistered", async () => {
      const handler = jest.fn();
      onUnauthorized(handler)();
      respondWith(401, {});

      await apiRequest("/anything").catch(() => undefined);

      expect(handler).not.toHaveBeenCalled();
    });

    it("keeps a replacing handler when the replaced one unregisters", async () => {
      const first = jest.fn();
      const second = jest.fn();
      const unregisterFirst = onUnauthorized(first);
      const unregisterSecond = onUnauthorized(second);
      unregisterFirst();
      respondWith(401, {});

      await apiRequest("/anything").catch(() => undefined);

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
      unregisterSecond();
    });
  });
});
