"use server";

import type { AuthResponse, AuthResult, SignupFields } from "@/features/auth/types/auth";
import { clearSessionToken, setSessionToken } from "@/features/auth/services/session";
import { problemMessage } from "@/services/api-request";

// Server Actions run Node-side, where the /api rewrite does not apply, so they
// call the backend directly like getTournaments does.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

async function authenticate(path: "login" | "signup", body: object): Promise<AuthResult> {
  const response = await fetch(new URL(`/api/v1/auth/${path}`, apiProxyTarget), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // No JSON body (e.g. a proxy error page); problemMessage falls back to the status.
  }
  if (!response.ok) {
    return { ok: false, error: problemMessage(payload, response.status) };
  }

  const { token, user } = payload as AuthResponse;
  await setSessionToken(token);
  return { ok: true, user };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  return authenticate("login", { email, password });
}

export async function signup(fields: SignupFields): Promise<AuthResult> {
  return authenticate("signup", fields);
}

export async function logout() {
  await clearSessionToken();
}
