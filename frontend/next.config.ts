import type { NextConfig } from "next";

// The browser only ever calls same-origin /api, which Next proxies to the
// backend. No API hostname is baked into the bundle and no CORS is needed, so
// one build runs unchanged locally, on Vercel preview deployments, and in prod.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

// Vercel sets VERCEL=1 in its builds. Failing there beats shipping a site whose
// API calls quietly go to localhost.
if (process.env.VERCEL === "1" && !process.env.API_PROXY_TARGET) {
  throw new Error("API_PROXY_TARGET must be set in the Vercel project settings");
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
