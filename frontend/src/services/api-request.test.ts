import { apiRequest } from "./api-request";

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
});
