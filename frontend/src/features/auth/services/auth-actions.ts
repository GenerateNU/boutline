"use server";

import type { AuthResponse, AuthResult } from "@/features/auth/types/auth";
import { clearSessionToken, setSessionToken } from "@/features/auth/services/session";
import { problemMessage } from "@/services/api-request";


const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

async function authenticate(path: "login" | "signup", body: object): Promise<AuthResult> {
  let response: Response;
  try {
    response = await fetch(new URL(`/api/v1/auth/${path}`, apiProxyTarget), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    // An unreachable backend or a malformed API_PROXY_TARGET lands here; the
    // detail goes to the server log, never the credentials in body.
    console.error(`auth ${path}: backend request failed`, error);
    return { ok: false, error: "Couldn't reach the server. Try again in a moment." };
  }

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

function formField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

// These take FormData rather than plain arguments because Next's dev server
// logs every Server Action call with its arguments, and FormData logs as {},
// so the password never reaches the terminal.
export async function login(form: FormData): Promise<AuthResult> {
  return authenticate("login", {
    email: formField(form, "email"),
    password: formField(form, "password"),
  });
}

export async function signup(form: FormData): Promise<AuthResult> {
  return authenticate("signup", {
    email: formField(form, "email"),
    password: formField(form, "password"),
    firstName: formField(form, "firstName"),
    lastName: formField(form, "lastName"),
  });
}

export async function logout() {
  await clearSessionToken();
}
