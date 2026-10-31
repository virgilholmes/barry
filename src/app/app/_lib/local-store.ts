import { useSyncExternalStore } from "react";
import { onReset, secureStorage } from "./secure-storage";

// A tiny store React components can subscribe to, kept in the encrypted vault (see secure-storage.ts).
export function createLocalStore<T>({
  key,
  fallback,
  parse,
  initial,
}: {
  key: string;
  fallback: T;
  parse: (raw: unknown) => T;
  /** Used when nothing is saved yet, e.g. to migrate older data. */
  initial?: () => T | undefined;
}) {
  let value = fallback;
  let loaded = false;
  const listeners = new Set<() => void>();
  // Locking or unlocking swaps what's in the vault, so reload from it next time.
  onReset(() => {
    loaded = false;
    value = fallback;
    listeners.forEach((listener) => listener());
  });

  function load() {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = secureStorage.getItem(key);
      if (raw !== null) value = parse(JSON.parse(raw));
      else value = initial?.() ?? fallback;
    } catch {
      value = fallback;
    }
  }

  function get() {
    load();
    return value;
  }

  function set(next: T | ((current: T) => T)) {
    load();
    value = typeof next === "function" ? (next as (current: T) => T)(value) : next;
    try {
      secureStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable; keep it in memory for this session.
    }
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function use() {
    return useSyncExternalStore(subscribe, get, () => fallback);
  }

  return { get, set, use };
}
