/**
 * @jest-environment node
 */
import { cookies } from "next/headers";

import { login, logout, signup } from "@/features/auth/services/auth-actions";
import { SESSION_COOKIE, getSessionToken } from "@/features/auth/services/session";

jest.mock("next/headers", () => ({ cookies: jest.fn() }));

type StoredCookie = { value: string; options: Record<string, unknown> };

// Stands in for Next's request cookie store so a test reads back what an
// action stored, the way the next request would.
function fakeCookieStore() {
  const jar = new Map<string, StoredCookie>();
  return {
    jar,
    set: (name: string, value: string, options: Record<string, unknown>) =>
      jar.set(name, { value, options }),
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)!.value } : undefined),
    delete: (name: string) => jar.delete(name),
  };
}

const user = {
  id: "0b6c1f0e-8d1f-4c55-9f43-1f2b3c4d5e6f",
  email: "ada@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  createdAt: "2026-10-17T00:00:00Z",
  updatedAt: "2026-10-17T00:00:00Z",
};

function respond(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe("auth actions", () => {
  const fetchMock = jest.fn();
  let store: ReturnType<typeof fakeCookieStore>;

  beforeEach(() => {
    store = fakeCookieStore();
    jest.mocked(cookies).mockResolvedValue(store as never);
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it.each([
    { name: "login", call: () => login("ada@example.com", "hunter2"), path: "/api/v1/auth/login" },
    {
      name: "signup",
      call: () =>
        signup({ email: "ada@example.com", password: "hunter2", firstName: "Ada", lastName: "Lovelace" }),
      path: "/api/v1/auth/signup",
    },
  ])("$name stores the token in an httpOnly session cookie", async ({ call, path }) => {
    fetchMock.mockResolvedValue(respond(200, { token: "jwt-abc", user }));

    const result = await call();

    expect(result).toEqual({ ok: true, user });
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe(path);
    await expect(getSessionToken()).resolves.toBe("jwt-abc");
    expect(store.jar.get(SESSION_COOKIE)?.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });
  });

  it.each([
    {
      name: "wrong credentials",
      response: respond(401, { detail: "email or password is incorrect" }),
      want: "email or password is incorrect",
    },
    {
      name: "a field the backend rejected",
      response: respond(422, {
        detail: "validation failed",
        errors: [{ location: "body.email", message: "expected string to be RFC 5322 email" }],
      }),
      want: "validation failed (body.email: expected string to be RFC 5322 email)",
    },
    {
      name: "a non-JSON error page",
      response: { ok: false, status: 502, json: async () => Promise.reject(new SyntaxError()) },
      want: "Request failed with status 502",
    },
  ])("login reports $name without starting a session", async ({ response, want }) => {
    fetchMock.mockResolvedValue(response);

    await expect(login("ada@example.com", "nope")).resolves.toEqual({ ok: false, error: want });
    await expect(getSessionToken()).resolves.toBeUndefined();
  });

  it("logout ends the session", async () => {
    fetchMock.mockResolvedValue(respond(200, { token: "jwt-abc", user }));
    await login("ada@example.com", "hunter2");

    await logout();

    await expect(getSessionToken()).resolves.toBeUndefined();
  });
});
