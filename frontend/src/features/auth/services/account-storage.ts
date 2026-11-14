import { removeSessionStorageKeys } from "@/lib/hooks/use-session-storage";

// sessionStorage keys holding one account's data start with this, so signing out
// can clear them without touching per-tab conveniences like pinned fencers.
export const ACCOUNT_STORAGE_PREFIX = "account:";

// Which account the prefixed keys belong to. Outside the prefix so clearing the
// keys doesn't clear it.
const OWNER_KEY = "account-owner";

export function clearAccountStorage() {
  removeSessionStorageKeys(ACCOUNT_STORAGE_PREFIX);
  try {
    sessionStorage.removeItem(OWNER_KEY);
  } catch {}
}

// Called on sign-in. An expired session sends the user to login without logging
// out, so a different account (or one we can't tell) signing in next must not
// inherit the last one's drafts. The same account signing back in keeps them.
export function claimAccountStorage(userId: string) {
  let owner: string | null = null;
  try {
    owner = sessionStorage.getItem(OWNER_KEY);
  } catch {}
  if (owner !== userId) {
    clearAccountStorage();
  }
  try {
    sessionStorage.setItem(OWNER_KEY, userId);
  } catch {}
}
