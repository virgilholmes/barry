// Stands in for localStorage for health data: an in-memory copy of the unlocked vault, saved
// encrypted shortly after each change. Locking clears it, and the stores built on it reset.
import { StaleVault, saveVault, withLog, type Session, type VaultData } from "./vault";

let session: Session | null = null;
let data: VaultData = { items: {}, log: [] };
let onStale: () => void = () => {};
let timer: ReturnType<typeof setTimeout> | undefined;
const resetListeners = new Set<() => void>();

function save() {
  clearTimeout(timer);
  timer = undefined;
  if (!session) return Promise.resolve();
  return saveVault(session, data).catch((error) => {
    if (error instanceof StaleVault) onStale();
  });
}

// Streaming replies change a chat many times a second, so saves are batched.
function schedule() {
  if (!timer) timer = setTimeout(save, 400);
}

export const secureStorage = {
  getItem: (key: string) => data.items[key] ?? null,
  setItem(key: string, value: string) {
    if (!session) return;
    data = { ...data, items: { ...data.items, [key]: value } };
    schedule();
  },
};

export function openStorage(next: Session, saved: VaultData, stale: () => void) {
  session = next;
  data = saved;
  onStale = stale;
  resetListeners.forEach((listener) => listener());
}

export function replaceSession(next: Session, saved: VaultData) {
  session = next;
  data = saved;
}

export const currentLog = () => data.log;

export function logEvent(event: string) {
  if (!session) return Promise.resolve();
  data = withLog(data, event);
  return save();
}

// Saves what's pending (with a last log entry), then forgets everything decrypted.
export function closeStorage(event?: string) {
  const done = event ? logEvent(event) : save();
  session = null;
  data = { items: {}, log: [] };
  resetListeners.forEach((listener) => listener());
  return done;
}

export const snapshot = () => data;

export function onReset(listener: () => void) {
  resetListeners.add(listener);
  return () => {
    resetListeners.delete(listener);
  };
}
