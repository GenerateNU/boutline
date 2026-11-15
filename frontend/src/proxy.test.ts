/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { getRedirectUrl, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

import { SESSION_COOKIE } from "@/features/auth/services/session";
import { config, proxy } from "@/proxy";

function requestTo(
  path: string,
  init: { token?: string; authorization?: string; method?: string } = {},
) {
  const headers = new Headers();
  if (init.token) {
    headers.set("cookie", `${SESSION_COOKIE}=${init.token}`);
  }
  if (init.authorization) {
    headers.set("authorization", init.authorization);
  }
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers, method: init.method });
}

// NextResponse.next({ request: { headers } }) reports each forwarded request
// header back as x-middleware-request-<name>; this is what reaches the backend.
function forwardedAuthorization(response: Response) {
  return response.headers.get("x-middleware-request-authorization");
}

const originalFetch = global.fetch;
const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});

afterAll(() => {
  global.fetch = originalFetch;
});

function backendReplies(status: number) {
  const body = status === 200 ? { id: "u1" } : { title: "nope" };
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe("proxy", () => {
  it.each([
    { name: "forwards the session as a bearer token", token: "abc", want: "Bearer abc" },
    { name: "leaves a cookieless request without one", token: undefined, want: null },
    {
      name: "keeps an Authorization header the caller set",
      token: "abc",
      authorization: "Bearer explicit",
      want: "Bearer explicit",
    },
  ])("on /api: $name", async ({ token, authorization, want }) => {
    const response = await proxy(requestTo("/api/v1/bouts/1/start", { token, authorization }));

    expect(getRedirectUrl(response)).toBeNull();
    expect(forwardedAuthorization(response)).toBe(want);
  });

  it("never adds the session token to a page request", async () => {
    const response = await proxy(requestTo("/admin", { token: "abc" }));

    expect(forwardedAuthorization(response)).toBeNull();
  });

  it.each([
    { path: "/admin", want: "http://localhost:3000/login?next=%2Fadmin" },
    {
      path: "/admin/tournaments/new?step=2",
      want: "http://localhost:3000/login?next=%2Fadmin%2Ftournaments%2Fnew%3Fstep%3D2",
    },
    {
      path: "/tournaments/t1/events/e1/bout/b1/referee",
      want: "http://localhost:3000/login?next=%2Ftournaments%2Ft1%2Fevents%2Fe1%2Fbout%2Fb1%2Freferee",
    },
  ])("redirects a logged-out visitor from $path to login", async ({ path, want }) => {
    expect(getRedirectUrl(await proxy(requestTo(path)))).toBe(want);
  });

  it.each([
    { name: "200 lets them through", reply: () => backendReplies(200) },
    { name: "500 lets them through", reply: () => backendReplies(500) },
    { name: "403 lets them through", reply: () => backendReplies(403) },
    {
      name: "an unreachable backend lets them through",
      reply: () => fetchMock.mockRejectedValue(new TypeError("fetch failed")),
    },
  ])("a visitor with a session on /admin: $name", async ({ reply }) => {
    reply();
    const response = await proxy(requestTo("/admin", { token: "abc" }));

    expect(getRedirectUrl(response)).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("sends a rejected session to login and clears its cookie", async () => {
    backendReplies(401);
    const response = await proxy(requestTo("/admin", { token: "abc" }));

    expect(getRedirectUrl(response)).toBe("http://localhost:3000/login?next=%2Fadmin");
    expect(response.headers.get("set-cookie")).toMatch(
      new RegExp(`${SESSION_COOKIE}=;.*Expires=Thu, 01 Jan 1970`),
    );
  });

  it("checks the session against /auth/me with the bearer token", async () => {
    backendReplies(200);
    await proxy(requestTo("/admin", { token: "abc" }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(url).pathname).toBe("/api/v1/auth/me");
    expect(init.headers).toEqual({ Authorization: "Bearer abc" });
  });

  it.each([
    { name: "a POST to a page", path: "/admin", method: "POST" },
    { name: "an /api request", path: "/api/v1/bouts/1/start", method: "GET" },
  ])("skips the backend check for $name", async ({ path, method }) => {
    const response = await proxy(requestTo(path, { token: "abc", method }));

    expect(getRedirectUrl(response)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Public pages never reach the proxy, so the matcher is what keeps them open.
  it.each([
    { path: "/api/v1/tournaments", want: true },
    { path: "/admin", want: true },
    { path: "/admin/tournaments/new", want: true },
    { path: "/admin/tournaments/t1/referees", want: true },
    { path: "/tournaments/t1/referees", want: false },
    { path: "/tournaments/t1/events/e1/bout/b1/referee", want: true },
    { path: "/tournaments", want: false },
    { path: "/tournaments/t1/events/e1/bout/b1", want: false },
    { path: "/administrators", want: false },
    { path: "/login", want: false },
  ])("matcher runs on $path: $want", ({ path, want }) => {
    expect(unstable_doesMiddlewareMatch({ config, url: path })).toBe(want);
  });
});
