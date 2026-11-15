import { logout } from "./auth-actions";

let pendingExpiry: Promise<void> | null = null;

async function runExpiry(navigate: (href: string) => void) {
  const next = window.location.pathname + window.location.search;
  try {
    await logout();
  } catch {
    // Still leave: the proxy deletes the dead cookie on the next protected request.
  }
  navigate(`/login?${new URLSearchParams({ next })}`);
  // Reset only once navigation has started, so a straggling 401 doesn't log out twice.
  pendingExpiry = null;
}

// Several requests can 401 at once; they share one logout and one redirect.
export function expireSession(navigate: (href: string) => void) {
  pendingExpiry ??= runExpiry(navigate);
  return pendingExpiry;
}
