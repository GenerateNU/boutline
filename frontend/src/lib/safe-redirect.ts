// Only same-site paths are allowed, so a crafted /login?next=https://evil.example
// (or the protocol-relative //evil.example) can't send a user off-site after login.
export function safeRedirectPath(next: unknown, fallback: string): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
