import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/features/auth/services/session";
import type { ProxyStep } from "@/services/proxy-chain";

// Page scripts can't read the session cookie, moves into the backend header
export const forwardSessionToken: ProxyStep = ({ request, requestHeaders }) => {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (request.nextUrl.pathname.startsWith("/api/") && token && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }
  return undefined;
};

// Sends a visitor without a session to login, remembering the page they asked
// for in ?next= so login can return them there. The proxy matcher only lets
// /api and protected pages through, so any other path here needs a session.
export const requireSession: ProxyStep = ({ request }) => {
  const { pathname, search } = request.nextUrl;
  if (request.cookies.has(SESSION_COOKIE) || pathname.startsWith("/api/")) {
    return undefined;
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
};
