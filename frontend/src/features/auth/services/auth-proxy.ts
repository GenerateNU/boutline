import { NextResponse, NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/features/auth/services/session";
import { AuthUser } from "@/features/auth/types/auth";
import { ApiError } from "@/services/api-request";
import type { ProxyStep } from "@/services/proxy-chain";
import { serverRequest } from "@/services/server-request";

// Page scripts can't read the session cookie, moves into the backend header
export const forwardSessionToken: ProxyStep = ({ request, requestHeaders }) => {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (request.nextUrl.pathname.startsWith("/api/") && token && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }
  return undefined;
};

function redirectToLogin(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

// Only a 401 means signed out; an outage or 5xx lets the page load rather than logging everyone out.
async function sessionRejected(token: string): Promise<boolean> {
  try {
    await serverRequest<AuthUser>("/auth/me", { token });
    return false;
  } catch (error) {
    return error instanceof ApiError && error.status === 401;
  }
}

// Sends a visitor without a valid session to login, remembering the page they asked
// for in ?next= so login can return them there. The proxy matcher only lets
// /api and protected pages through, so any other path here needs a session. Only GET
// page loads are checked against the backend: a redirect would replay a Server Action
// POST against /login, and those actions authenticate with the backend themselves.
export const requireSession: ProxyStep = async ({ request }) => {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return undefined;
  }
  if (!token) {
    return redirectToLogin(request);
  }
  if (request.method !== "GET" || !(await sessionRejected(token))) {
    return undefined;
  }

  // Clearing the stale cookie stops /login from bouncing the visitor straight back.
  const response = redirectToLogin(request);
  response.cookies.delete(SESSION_COOKIE);
  return response;
};
