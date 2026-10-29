import { useSyncExternalStore } from "react";

/** A tiny observable value (module-level state shared across routes). */
export function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: T | ((prev: T) => T)) {
      value = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export type Store<T> = ReturnType<typeof createStore<T>>;

export function useStore<T>(store: Store<T>) {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/** localStorage / sessionStorage that never throws (private mode, quota). */
export function readJSON<T>(storage: "local" | "session", key: string): T | null {
  try {
    const raw = (storage === "local" ? localStorage : sessionStorage).getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export function writeJSON(storage: "local" | "session", key: string, value: unknown) {
  try {
    (storage === "local" ? localStorage : sessionStorage).setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function removeKey(storage: "local" | "session", key: string) {
  try {
    (storage === "local" ? localStorage : sessionStorage).removeItem(key);
  } catch {
    // ignore
  }
}
