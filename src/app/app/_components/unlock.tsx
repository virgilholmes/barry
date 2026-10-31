"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useUser } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";
import { cn } from "@/lib/utils";
import {
  MIN_PASSWORD,
  MIN_PIN,
  TooManyTries,
  WrongPasscode,
  createVault,
  eraseVault,
  lockKind,
  purgeLegacy,
  secretProblem,
  unlockVault,
  vaultStatus,
  type SecretKind,
  type Session,
  type VaultData,
  type VaultStatus,
} from "../_lib/vault";
import { ConfirmErase, button, field } from "./ui";

export type Opened = { session: Session; data: VaultData; failed: number; created: boolean };
export type LockReason = "idle" | "elsewhere" | "left" | null;

const LOCKED_BECAUSE: Record<Exclude<LockReason, null>, string> = {
  idle: "Barry locked because it wasn't used for a while.",
  elsewhere: "Barry locked because it was changed in another tab or window.",
  left: "Barry locked when you left it.",
};

const NAMES: Record<SecretKind, string> = { pin: "PIN", password: "password" };

// Another tab can create or erase the vault, so re-read it whenever storage changes.
function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// Password managers file the secret under this, so each account on a shared browser gets its own.
export function useAccountName(owner: string) {
  return useUser().user?.primaryEmailAddress?.emailAddress ?? owner;
}

export function Unlock({
  owner,
  lockedBy,
  onOpen,
}: {
  owner: string;
  lockedBy: LockReason;
  onOpen: (opened: Opened) => void;
}) {
  const status = useSyncExternalStore<VaultStatus | "checking">(
    subscribeStorage,
    () => vaultStatus(owner),
    () => "checking",
  );
  const [erasing, setErasing] = useState(false);
  const account = useAccountName(owner);

  useEffect(purgeLegacy, []);

  function erase() {
    eraseVault(owner);
    setErasing(false);
  }

  return (
    <AuthShell>
      <div className="w-full max-w-md py-8">
        {lockedBy && status === "locked" && (
          <p role="status" className="mb-8 rounded-xl bg-muted p-4 text-lg">
            {LOCKED_BECAUSE[lockedBy]}
          </p>
        )}

        {status === "checking" && (
          <p role="status" className="text-lg">
            Opening Barry…
          </p>
        )}
        {status === "insecure" && (
          <Problem title="Barry needs a secure connection">
            Open Barry from an address that starts with https://. Browsers only allow Barry to lock your information
            on secure pages.
          </Problem>
        )}
        {status === "unavailable" && (
          <Problem title="This browser won't let Barry save">
            Site storage is turned off, maybe by private browsing or a browser setting. Turn it on for this site to use
            Barry.
          </Problem>
        )}
        {status === "damaged" && (
          <Problem title="Barry can't open your saved information">
            The saved information on this device is damaged. Erase it to start over.
            <button className={cn(button.danger, "mt-6 w-full")} onClick={() => setErasing(true)}>
              Erase and start over
            </button>
          </Problem>
        )}
        {status === "none" && (
          <SecretForm
            account={account}
            submitLabel="Lock Barry"
            busyLabel="Locking…"
            failMessage="Barry couldn't save on this device. Check that this browser allows site storage, then try again."
            onSubmit={async (secret, kind) => {
              const { session, data } = await createVault(owner, secret, kind);
              onOpen({ session, data, failed: 0, created: true });
            }}
          >
            <h1 className="text-3xl font-semibold tracking-tight">Choose how to lock Barry</h1>
            <p className="mt-3 text-lg">
              What you tell Barry is locked with a PIN or a password. It stays on this device and is never sent
              anywhere, not even to your Barry account.
            </p>
          </SecretForm>
        )}
        {status === "locked" && (
          <EnterSecret
            owner={owner}
            account={account}
            kind={lockKind(owner)}
            onOpen={onOpen}
            onForgot={() => setErasing(true)}
          />
        )}
      </div>
      <ConfirmErase open={erasing} onClose={() => setErasing(false)} onErase={erase} />
    </AuthShell>
  );
}

function Problem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="alert">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-3 text-lg">{children}</div>
    </div>
  );
}

// Password first and chosen by default: it is the safer of the two.
const KINDS: { kind: SecretKind; label: string; detail: string }[] = [
  {
    kind: "password",
    label: "Password",
    detail: `${MIN_PASSWORD} or more characters, like three or four words. Much harder for someone else to guess.`,
  },
  { kind: "pin", label: "PIN", detail: `${MIN_PIN} or more numbers. Quick to type.` },
];

const RULES: Record<SecretKind, string> = {
  pin: `Use at least ${MIN_PIN} numbers. Avoid easy ones like 123456. A PIN is quicker to type, but easier to guess if someone copies this device's data. After 5 wrong tries, Barry makes you wait before trying again.`,
  password: `Use at least ${MIN_PASSWORD} characters. Three or four words you'll remember work well. Don't reuse your sign-in password.`,
};

// Choosing and confirming a new PIN or password, for first setup and for changing it later.
export function SecretForm({
  account,
  submitLabel,
  busyLabel,
  failMessage,
  onSubmit,
  children,
}: {
  account: string;
  submitLabel: string;
  busyLabel: string;
  failMessage: string;
  onSubmit: (secret: string, kind: SecretKind) => Promise<void>;
  children: React.ReactNode;
}) {
  const [kind, setKind] = useState<SecretKind>("password");
  const [secret, setSecret] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();
  const length = [...secret].length;
  const name = NAMES[kind];

  function choose(next: SecretKind) {
    setKind(next);
    setSecret("");
    setAgain("");
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const problem = secretProblem(kind, secret);
    if (problem) return setError(problem);
    if (secret !== again) return setError(`The two ${name}s don't match. Type them again.`);

    setError(null);
    setBusy(true);
    try {
      await onSubmit(secret, kind);
    } catch {
      setError(failMessage);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} noValidate>
      {children}

      <fieldset className="mt-6">
        <legend className="text-lg font-medium">Lock with</legend>
        <div className="mt-2 grid gap-2">
          {KINDS.map((option) => (
            <label
              key={option.kind}
              className="flex min-h-14 cursor-pointer items-start gap-4 rounded-xl border-[1.5px] border-control px-4 py-3 has-checked:border-foreground has-checked:bg-muted"
            >
              <input
                type="radio"
                name={`${id}-kind`}
                value={option.kind}
                checked={kind === option.kind}
                onChange={() => choose(option.kind)}
                className="mt-1 size-6 shrink-0 accent-foreground"
              />
              <span>
                <span className="block text-lg font-semibold">{option.label}</span>
                <span className="block text-base text-muted-foreground">{option.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <p id={`${id}-rule`} className="mt-6 text-lg">
        {RULES[kind]}
      </p>

      {/* Lets password managers save the PIN or password for this account. */}
      <input type="text" name="username" autoComplete="username" value={account} readOnly hidden />
      <SecretField
        id={`${id}-secret`}
        label={kind === "pin" ? "PIN" : "Password"}
        kind={kind}
        value={secret}
        onChange={setSecret}
        show={show}
        isNew
        invalid={!!error}
        describedBy={`${id}-rule ${id}-count ${id}-error`}
      />
      <p id={`${id}-count`} className="mt-2 text-base text-muted-foreground">
        {kind === "pin" ? `${length} of ${MIN_PIN} numbers` : `${length} of ${MIN_PASSWORD} characters`}
      </p>
      <SecretField
        id={`${id}-again`}
        label="Type it again"
        kind={kind}
        value={again}
        onChange={setAgain}
        show={show}
        isNew
        invalid={!!error && secret !== again}
        describedBy={`${id}-error`}
      />
      <ShowToggle label={`Show ${name}`} show={show} onChange={setShow} />

      <p id={`${id}-error`} role="alert" className="mt-4 font-semibold text-destructive empty:hidden">
        {error}
      </p>
      <p className="mt-6 text-base text-muted-foreground">
        If you forget your {name}, nobody can get your information back, and you would need to erase it and start
        over.
      </p>
      <button type="submit" aria-busy={busy} className={cn(button.primary, "mt-6 w-full")}>
        {busy ? busyLabel : submitLabel}
      </button>
    </form>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function waitText(retryAt: number) {
  const seconds = Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));
  return seconds < 60 ? plural(seconds, "second") : plural(Math.ceil(seconds / 60), "minute");
}

function EnterSecret({
  owner,
  account,
  kind,
  onOpen,
  onForgot,
}: {
  owner: string;
  account: string;
  kind: SecretKind;
  onOpen: (opened: Opened) => void;
  onForgot: () => void;
}) {
  const [secret, setSecret] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const name = NAMES[kind];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!secret) return setError(`Enter your ${name}.`);

    setError(null);
    setBusy(true);
    try {
      onOpen({ ...(await unlockVault(owner, secret)), created: false });
    } catch (e) {
      setError(
        e instanceof TooManyTries
          ? `Too many wrong tries. You can try again in ${waitText(e.retryAt)}.`
          : e instanceof WrongPasscode
            ? `That ${name} didn't work. Check it and try again.`
            : "Barry couldn't open your information on this device.",
      );
      setBusy(false);
      input.current?.select();
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-3 text-lg">Enter your {name} to open what Barry knows about you.</p>

      <input type="text" name="username" autoComplete="username" value={account} readOnly hidden />
      <SecretField
        ref={input}
        id="secret"
        label={kind === "pin" ? "PIN" : "Password"}
        kind={kind}
        value={secret}
        onChange={setSecret}
        show={show}
        autoFocus
        invalid={!!error}
        describedBy="secret-error"
      />
      <ShowToggle label={`Show ${name}`} show={show} onChange={setShow} />

      <p id="secret-error" role="alert" className="mt-4 font-semibold text-destructive empty:hidden">
        {error}
      </p>
      <button type="submit" aria-busy={busy} className={cn(button.primary, "mt-6 w-full")}>
        {busy ? "Unlocking…" : "Unlock"}
      </button>
      {/* Erasing while an unlock is still working could be undone by it. */}
      <button type="button" onClick={onForgot} disabled={busy} className={cn(button.quiet, "mt-3 w-full")}>
        Forgot your {name}?
      </button>
    </form>
  );
}

function SecretField({
  ref,
  id,
  label,
  kind,
  value,
  onChange,
  show,
  isNew,
  autoFocus,
  invalid,
  describedBy,
}: {
  ref?: React.Ref<HTMLInputElement>;
  id: string;
  label: string;
  kind: SecretKind;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  isNew?: boolean;
  autoFocus?: boolean;
  invalid: boolean;
  describedBy: string;
}) {
  return (
    <div className="mt-6">
      <label htmlFor={id} className="block text-lg font-medium">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        type={show ? "text" : "password"}
        // A number keypad on phones for PINs.
        inputMode={kind === "pin" ? "numeric" : undefined}
        pattern={kind === "pin" ? "[0-9]*" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={isNew ? "new-password" : "current-password"}
        autoFocus={autoFocus}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="none"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(field, "mt-2 min-h-14", kind === "pin" && "tracking-[0.3em]")}
      />
    </div>
  );
}

function ShowToggle({ label, show, onChange }: { label: string; show: boolean; onChange: (show: boolean) => void }) {
  return (
    <label className="mt-4 flex min-h-12 w-fit cursor-pointer items-center gap-3 text-lg">
      <input
        type="checkbox"
        checked={show}
        onChange={(event) => onChange(event.target.checked)}
        className="size-6 accent-foreground"
      />
      {label}
    </label>
  );
}
