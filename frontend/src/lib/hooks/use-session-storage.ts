import { useCallback, useSyncExternalStore } from "react";

type Listener = () => void;

// sessionStorage has no change event for same-tab writes, so instances sharing
// a key notify each other through this in-module listener set.
const listeners = new Map<string, Set<Listener>>();

interface CacheEntry<T> {
  raw: string | null;
  value: T;
}

// useSyncExternalStore requires getSnapshot to return the same reference while
// nothing has changed; parsing the stored JSON fresh on every call would hand
// back a new object each time for any non-primitive T. This cache re-parses
// only when the raw stored string actually differs from what's cached.
const cache = new Map<string, CacheEntry<unknown>>();

function emit(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function subscribe(key: string, onStoreChange: Listener) {
  const set = listeners.get(key) ?? new Set();
  set.add(onStoreChange);
  listeners.set(key, set);
  return () => set.delete(onStoreChange);
}

function readValue<T>(key: string, initialValue: T): T {
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(key);
  } catch {
    raw = null;
  }

  const cached = cache.get(key);
  if (cached && cached.raw === raw) {
    return cached.value as T;
  }

  let value = initialValue;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = initialValue;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

function writeValue<T>(key: string, value: T) {
  const raw = JSON.stringify(value);
  try {
    window.sessionStorage.setItem(key, raw);
  } catch {
    // Quota exceeded or sessionStorage unavailable: cache still reflects the new value.
  }
  cache.set(key, { raw, value });
  emit(key);
}

// useSyncExternalStore (rather than useState+useEffect) keeps the read in the
// render/snapshot path, avoiding a setState-in-effect cascade and giving a
// server snapshot for free.
function useSessionStorage<T>(
  key: string,
  initialValue: T,
): readonly [T, (value: T) => void] {
  const value = useSyncExternalStore(
    useCallback((onStoreChange: Listener) => subscribe(key, onStoreChange), [key]),
    useCallback(() => readValue(key, initialValue), [key, initialValue]),
    () => initialValue,
  );

  const setStoredValue = useCallback((next: T) => writeValue(key, next), [key]);

  return [value, setStoredValue] as const;
}

export { useSessionStorage };
