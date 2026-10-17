import { cookies } from "next/headers";

export const SESSION_COOKIE = "boutline_session";

// Matches the backend's token lifetime (user.UserTokenTTL), so the cookie never
// outlives the token inside it.
const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

// httpOnly keeps the token away from page scripts; sameSite=lax stops other
// sites from making the browser send it on a cross-site POST.
export async function setSessionToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionToken() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}
