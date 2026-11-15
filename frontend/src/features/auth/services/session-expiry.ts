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
}

// Several requests can 401 at once; they share one logout and one redirect.
export function expireSession(navigate: (href: string) => void) {
  pendingExpiry ??= runExpiry(navigate);
  return pendingExpiry;
}

// router.replace returns before the old page unmounts, so a 401 in that window must
// still find the run; SessionWatcher resets it only once it unmounts.
export function resetSessionExpiry() {
  pendingExpiry = null;
}
