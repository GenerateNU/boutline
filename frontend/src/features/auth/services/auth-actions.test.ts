/**
 * @jest-environment node
 */
import { cookies } from "next/headers";

import { login, logout, signup } from "@/features/auth/services/auth-actions";
import { SESSION_COOKIE, getSessionToken } from "@/features/auth/services/session";

jest.mock("next/headers", () => ({ cookies: jest.fn() }));

interface StoredCookie {
  value: string;
  options: Record<string, unknown>;
}

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

function formOf(fields: Record<string, string>) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    form.set(name, value);
  }
  return form;
}

const credentials = formOf({ email: "ada@example.com", password: "hunter2" });

function respond(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe("auth actions", () => {
  // Next's dev server prints each Server Action's arguments; a FormData prints
  // as {}, which is what keeps the password out of the terminal.
  it("passes credentials in a form whose logged form hides the password", () => {
    const { formatArgs } = jest.requireActual("next/dist/server/dev/server-action-logger.js");

    expect(formatArgs([credentials])).toBe("{}");
  });

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
    {
      name: "login",
      call: () => login(credentials),
      path: "/api/v1/auth/login",
      wantBody: { email: "ada@example.com", password: "hunter2" },
    },
    {
      name: "signup",
      call: () =>
        signup(formOf({ email: "ada@example.com", password: "hunter2", firstName: "Ada", lastName: "Lovelace" })),
      path: "/api/v1/auth/signup",
      wantBody: { email: "ada@example.com", password: "hunter2", firstName: "Ada", lastName: "Lovelace" },
    },
  ])("$name stores the token in an httpOnly session cookie", async ({ call, path, wantBody }) => {
    fetchMock.mockResolvedValue(respond(200, { token: "jwt-abc", user }));

    const result = await call();

    expect(result).toEqual({ ok: true, user });
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe(path);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(wantBody);
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

    await expect(login(formOf({ email: "ada@example.com", password: "nope" }))).resolves.toEqual({ ok: false, error: want });
    await expect(getSessionToken()).resolves.toBeUndefined();
  });

  it("logout ends the session", async () => {
    fetchMock.mockResolvedValue(respond(200, { token: "jwt-abc", user }));
    await login(credentials);

    await logout();

    await expect(getSessionToken()).resolves.toBeUndefined();
  });
});
