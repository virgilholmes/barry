// Encrypted in localStorage with AES-256-GCM; the key is derived from the passcode and
// only lives in memory, so reloading or leaving the page locks the vault.

export type Profile = {
  name: string;
  conditions: string;
  medications: string;
  allergies: string;
  communication: string[];
  communicationNotes: string;
  supporter: string;
};

export type LogEntry = { at: number; event: string };
export type VaultData = { profile: Profile; log: LogEntry[] };
export type SecretKind = "pin" | "password";
// iv identifies the stored copy this tab last read or wrote, so a stale tab can't overwrite a newer one.
export type Session = { key: CryptoKey; salt: string; slot: string; iv: string | null; kind: SecretKind };
export type VaultStatus = "none" | "locked" | "damaged" | "unavailable" | "insecure";

// kind is stored in the clear so the unlock screen can offer a number keypad for a PIN.
type Sealed = { v: 1; salt: string; iv: string; data: string; kind: SecretKind; failed: number; retryAt: number };

// One vault per signed-in account, so people sharing a browser can't open or erase each other's.
const slotFor = (owner: string) => `barry:vault:${owner}`;
// Earlier builds of the app kept chats here unencrypted.
const LEGACY_KEYS = ["barry:chats"];
// OWASP's 2023 recommendation for PBKDF2-HMAC-SHA256.
const ITERATIONS = 600_000;
const MAX_LOG = 200;

// NIST SP 800-63B-4: 15 characters for a password that is the only factor. A PIN is far easier to
// guess from a copied vault, so it gets the 6-digit floor for unlock codes plus waits after wrong tries.
export const MIN_PASSWORD = 15;
export const MIN_PIN = 6;
const FREE_TRIES = 5;
const FIRST_WAIT = 30_000;
const LONGEST_WAIT = 15 * 60_000;
export const IDLE_MINUTES = 5;
export const VISIT_IDLE_MINUTES = 30;

const emptyProfile: Profile = {
  name: "",
  conditions: "",
  medications: "",
  allergies: "",
  communication: [],
  communicationNotes: "",
  supporter: "",
};

export class WrongPasscode extends Error {}
export class StaleVault extends Error {}
export class TooManyTries extends Error {
  retryAt: number;
  constructor(retryAt: number) {
    super();
    this.retryAt = retryAt;
  }
}
class DamagedVault extends Error {}

// One short chunk repeated ("111111", "121212", "passwordpassword") is easy to guess.
const repeats = (secret: string) => /^(.{1,8})\1+$/u.test(secret);
// Every digit one more (or one less) than the last, like 123456 or 987654.
const run = (pin: string) =>
  [1, 9].some((step) => [...pin].every((d, i) => i === 0 || (Number(pin[i - 1]) + step) % 10 === Number(d)));
const COMMON_PINS = new Set(["112233", "123321", "102030", "147258", "159753", "789456", "963852", "147852"]);

// The reason a new PIN or password can't be used, or null if it's fine.
export function secretProblem(kind: SecretKind, secret: string) {
  if (kind === "pin") {
    if (!/^\d*$/.test(secret)) return "A PIN can only have numbers.";
    if (secret.length < MIN_PIN) return `Your PIN needs at least ${MIN_PIN} numbers.`;
    if (repeats(secret) || run(secret) || COMMON_PINS.has(secret)) {
      return "That PIN is too easy to guess. Avoid repeats like 111111 and runs like 123456.";
    }
    return null;
  }
  if ([...secret].length < MIN_PASSWORD) return `Your password needs at least ${MIN_PASSWORD} characters.`;
  if (repeats(secret) || new Set(secret).size < 5) return "That password is too easy to guess. Try three or four words.";
  return null;
}

const toBase64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function deriveKey(passcode: string, salt: BufferSource) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passcode.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function parse(raw: string | null): Sealed | null {
  if (raw === null) return null;
  try {
    const sealed = JSON.parse(raw) as Partial<Sealed>;
    if (
      sealed.v === 1 &&
      typeof sealed.salt === "string" &&
      typeof sealed.iv === "string" &&
      typeof sealed.data === "string"
    ) {
      return {
        v: 1,
        salt: sealed.salt,
        iv: sealed.iv,
        data: sealed.data,
        kind: sealed.kind === "pin" ? "pin" : "password",
        failed: Number(sealed.failed) || 0,
        retryAt: Number(sealed.retryAt) || 0,
      };
    }
  } catch {}
  throw new DamagedVault();
}

const read = (slot: string) => parse(localStorage.getItem(slot));

export function vaultStatus(owner: string): VaultStatus {
  if (!window.isSecureContext || !crypto.subtle) return "insecure";
  try {
    return read(slotFor(owner)) ? "locked" : "none";
  } catch (error) {
    return error instanceof DamagedVault ? "damaged" : "unavailable";
  }
}

export function lockKind(owner: string): SecretKind {
  try {
    return read(slotFor(owner))?.kind ?? "password";
  } catch {
    return "password";
  }
}

// For "storage" events: true when another tab saved or erased this session's vault.
export function changedElsewhere(session: Session, key: string | null, newValue: string | null) {
  if (key !== null && key !== session.slot) return false;
  try {
    return (parse(key === null ? null : newValue)?.iv ?? null) !== session.iv;
  } catch {
    return true;
  }
}

// `from` is the session whose stored copy this write replaces (a different one when changing the PIN or password).
async function write(session: Session, data: VaultData, from: Session) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(data));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, session.key, plain));
  const current = read(session.slot);
  if ((current?.iv ?? null) !== from.iv) throw new StaleVault();
  // Keep the wrong-try count and wait; only a successful unlock clears them.
  const sealed: Sealed = {
    v: 1,
    salt: session.salt,
    iv: toBase64(iv),
    data: toBase64(cipher),
    kind: session.kind,
    failed: current?.failed ?? 0,
    retryAt: current?.retryAt ?? 0,
  };
  localStorage.setItem(session.slot, JSON.stringify(sealed));
  session.iv = sealed.iv;
}

let queue: Promise<void> = Promise.resolve();

// Writes run one at a time so a slow encrypt can never overwrite a newer save.
export function saveVault(session: Session, data: VaultData, from = session) {
  const next = queue.then(() => write(session, data, from));
  queue = next.catch(() => {});
  return next;
}

export function withLog(data: VaultData, event: string): VaultData {
  return { ...data, log: [...data.log, { at: Date.now(), event }].slice(-MAX_LOG) };
}

const kindName = (kind: SecretKind) => (kind === "pin" ? "PIN" : "password");

async function newSession(slot: string, secret: string, kind: SecretKind, iv: string | null): Promise<Session> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { key: await deriveKey(secret, salt), salt: toBase64(salt), slot, iv, kind };
}

export async function createVault(owner: string, secret: string, kind: SecretKind) {
  // iv is null, so the first save refuses to replace a vault another tab created meanwhile.
  const session = await newSession(slotFor(owner), secret, kind, null);
  const data = withLog({ profile: emptyProfile, log: [] }, `Created a ${kindName(kind)}`);
  await saveVault(session, data);
  return { session, data };
}

// Re-encrypts everything under a new PIN or password. The old session can't save afterwards.
export async function changeSecret(session: Session, data: VaultData, secret: string, kind: SecretKind) {
  const next = await newSession(session.slot, secret, kind, null);
  const changed = withLog(data, `Changed to a ${kindName(kind)}`);
  await saveVault(next, changed, session);
  return { session: next, data: changed };
}

export async function unlockVault(owner: string, secret: string) {
  const slot = slotFor(owner);
  const sealed = read(slot);
  if (!sealed) throw new DamagedVault();
  if (sealed.retryAt > Date.now()) throw new TooManyTries(sealed.retryAt);
  const key = await deriveKey(secret, fromBase64(sealed.salt));

  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(sealed.iv) }, key, fromBase64(sealed.data));
  } catch {
    // AES-GCM can't tell a wrong secret from tampered data; both are refused. Re-read so an
    // erase or save that finished during key derivation isn't undone.
    const now = read(slot);
    if (now) {
      const failed = now.failed + 1;
      const wait = failed < FREE_TRIES ? 0 : Math.min(FIRST_WAIT * 2 ** (failed - FREE_TRIES), LONGEST_WAIT);
      const retryAt = wait ? Date.now() + wait : 0;
      localStorage.setItem(slot, JSON.stringify({ ...now, failed, retryAt }));
      if (retryAt) throw new TooManyTries(retryAt);
    }
    throw new WrongPasscode();
  }

  const saved = JSON.parse(new TextDecoder().decode(plain)) as Partial<VaultData>;
  const data: VaultData = {
    profile: { ...emptyProfile, ...saved.profile },
    log: Array.isArray(saved.log) ? saved.log : [],
  };
  const now = read(slot);
  if (now?.iv === sealed.iv && (now.failed || now.retryAt)) {
    localStorage.setItem(slot, JSON.stringify({ ...now, failed: 0, retryAt: 0 }));
  }
  const session: Session = { key, salt: sealed.salt, slot, iv: sealed.iv, kind: sealed.kind };
  return { session, data, failed: sealed.failed };
}

export function purgeLegacy() {
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function eraseVault(owner: string) {
  localStorage.removeItem(slotFor(owner));
  purgeLegacy();
}
