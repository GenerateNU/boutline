// sessionStorage keys holding one account's data start with this, so signing out
// can clear them without touching per-tab conveniences like pinned fencers.
export const ACCOUNT_STORAGE_PREFIX = "account:";

export function clearAccountStorage() {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(ACCOUNT_STORAGE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {}
}
