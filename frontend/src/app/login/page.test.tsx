/**
 * @jest-environment node
 */
import { cookies } from "next/headers";
import { getURLFromRedirectError } from "next/dist/client/components/redirect";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import LoginPage from "@/app/login/page";
import { SESSION_COOKIE } from "@/features/auth/services/session";

jest.mock("next/headers", () => ({ cookies: jest.fn() }));

function renderWith({ token, next }: { token?: string; next?: string }) {
  jest.mocked(cookies).mockResolvedValue({
    get: (name: string) => (name === SESSION_COOKIE && token ? { name, value: token } : undefined),
  } as unknown as Awaited<ReturnType<typeof cookies>>);
  return LoginPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ next }) });
}

// redirect() throws a special error carrying the target URL rather than returning.
async function redirectTarget(page: Promise<unknown>) {
  try {
    await page;
    return null;
  } catch (error) {
    if (isRedirectError(error)) {
      return getURLFromRedirectError(error);
    }
    throw error;
  }
}

describe("LoginPage", () => {
  it.each([
    { name: "to the admin home", next: undefined, want: "/admin/tournaments" },
    { name: "to the page in ?next=", next: "/admin/tournaments/t1", want: "/admin/tournaments/t1" },
    { name: "away from an off-site ?next=", next: "https://evil.example", want: "/admin/tournaments" },
  ])("sends a signed-in visitor $name", async ({ next, want }) => {
    expect(await redirectTarget(renderWith({ token: "abc", next }))).toBe(want);
  });

  it("shows the login screen to a signed-out visitor", async () => {
    expect(await redirectTarget(renderWith({}))).toBeNull();
  });
});
