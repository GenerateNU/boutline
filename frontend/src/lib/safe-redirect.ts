// A stand-in origin to resolve against: only whether the result stays on it
// matters, never the host itself.
const SAME_SITE_BASE = "https://same-site.invalid";

// Only same-site paths are allowed, so a crafted /login?next=https://evil.example
// (or the protocol-relative //evil.example) can't send a user off-site after login.
// URL parsers drop tabs and newlines and read "\" as "/", so "/\t/evil.example"
// would become //evil.example once navigated; those characters are refused
// outright, and the rest is resolved the way the browser would to confirm it
// stays on this site.
export function safeRedirectPath(next: unknown, fallback: string): string {
  if (typeof next !== "string" || !next.startsWith("/") || /[\p{Cc}\\]/u.test(next)) {
    return fallback;
  }

  const url = new URL(next, SAME_SITE_BASE);
  if (url.origin !== SAME_SITE_BASE) {
    return fallback;
  }
  return url.pathname + url.search + url.hash;
}
