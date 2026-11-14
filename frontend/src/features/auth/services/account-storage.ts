import { removeSessionStorageKeys } from "@/lib/hooks/use-session-storage";

// sessionStorage keys holding one account's data start with this, so signing out
// can clear them without touching per-tab conveniences like pinned fencers.
export const ACCOUNT_STORAGE_PREFIX = "account:";

export function clearAccountStorage() {
  removeSessionStorageKeys(ACCOUNT_STORAGE_PREFIX);
}
