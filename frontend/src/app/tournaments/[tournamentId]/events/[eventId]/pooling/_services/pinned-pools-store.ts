import { placeholderPinnedPoolIds } from "./pools";

const listeners = new Set<() => void>();

const storageKey = (eventId: string) => `boutline:pinned-pools:${eventId}`;

// The "storage" event only fires in other tabs, so same-tab writes notify through the listener set.
export function subscribePinnedPools(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function readPinnedPools(eventId: string): string | null {
  try {
    return localStorage.getItem(storageKey(eventId));
  } catch {
    return null;
  }
}

export function writePinnedPools(eventId: string, poolIds: string[]): void {
  try {
    localStorage.setItem(storageKey(eventId), JSON.stringify(poolIds));
  } catch {
    // Storage can be unavailable or full; pins then simply don't persist.
  }
  listeners.forEach((listener) => listener());
}

export function parsePinnedPools(raw: string | null): string[] {
  if (raw === null) {
    return placeholderPinnedPoolIds;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string")) {
      return parsed;
    }
  } catch {
    // Corrupt values fall through to the default.
  }
  return placeholderPinnedPoolIds;
}
