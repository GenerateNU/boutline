import { forwardSessionToken, requireSession } from "@/features/auth/services/auth-proxy";
import { chainProxySteps } from "@/services/proxy-chain";

// Next only runs a proxy from this exact file. Each concern lives in its own
// step, run in order.
export const proxy = chainProxySteps(forwardSessionToken, requireSession);

export const config = {
  // Next reads this at build time, so it must stay a literal in this file.
  // Besides /api, the pages listed here are the ones that need a session;
  // everything else is public and never reaches the proxy.
  matcher: [
    "/api/:path*",
    "/admin/:path*",
    "/tournaments/:tournamentId/events/:eventId/bout/:boutId/referee",
  ],
};
