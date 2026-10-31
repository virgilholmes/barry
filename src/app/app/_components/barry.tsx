"use client";

import { createContext, useContext, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  IDLE_MINUTES,
  StaleVault,
  VISIT_IDLE_MINUTES,
  changeSecret,
  changedElsewhere,
  eraseVault,
  type SecretKind,
  type Session,
} from "../_lib/vault";
import { closeStorage, currentLog, logEvent, openStorage, replaceSession, snapshot } from "../_lib/secure-storage";
import { ChatApp } from "./chat-app";
import { Privacy } from "./privacy";
import { Dialog, button } from "./ui";
import { Unlock, useAccountName, type LockReason, type Opened } from "./unlock";

const MINUTE = 60_000;
// WCAG 2.2.1 needs a warning at least 20 seconds before a time limit.
const WARNING = MINUTE;
// Screen readers and switch devices may only send click or input, so those count as use too.
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "click", "input"];

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// Lets the app's sidebar and views lock Barry, open Privacy, and mark a visit in progress.
// keepAlive: call on speech or other activity that doesn't come from the keyboard or pointer.
type Controls = { lock: () => void; openPrivacy: () => void; setVisiting: (visiting: boolean) => void; keepAlive: () => void };
export const LockControls = createContext<Controls>({ lock() {}, openPrivacy() {}, setVisiting() {}, keepAlive() {} });
export const useLockControls = () => useContext(LockControls);

export function Barry() {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return (
      <p role="status" className="m-auto p-5 text-lg">
        Opening Barry…
      </p>
    );
  }
  // The proxy already sends signed-out visitors to sign in; this covers a session ending mid-use.
  if (!userId) {
    return (
      <main className="m-auto max-w-md p-5 text-center">
        <p className="text-lg">Your session ended. Sign in again to open Barry.</p>
        <Link href="/sign-in" className={cn(button.primary, "mt-6")}>
          Sign in
        </Link>
      </main>
    );
  }
  // Keyed by account so switching accounts drops anything the last one unlocked.
  return <Gate key={userId} owner={userId} />;
}

function Gate({ owner }: { owner: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [visiting, setVisiting] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState(false);
  const [lockedBy, setLockedBy] = useState<LockReason>(null);
  const lastActive = useRef(0);
  const account = useAccountName(owner);

  const touch = () => {
    lastActive.current = Date.now();
  };

  function stay() {
    touch();
    setWarning(false);
  }

  // Forget everything decrypted. `event` is logged and saved first; without it nothing is written.
  function drop(reason: LockReason, event?: string) {
    if (event) void closeStorage(event);
    else closeStorage();
    setSession(null);
    setVisiting(false);
    setPrivacy(false);
    setNotice(null);
    setWarning(false);
    setLockedBy(reason);
  }

  function open({ session: next, data, failed }: Opened) {
    touch();
    setLockedBy(null);
    openStorage(next, data, () => drop("elsewhere"));
    void logEvent(failed ? `Unlocked after ${plural(failed, "wrong try", "wrong tries")}` : "Unlocked");
    if (failed) {
      setNotice(
        `The wrong ${next.kind === "pin" ? "PIN" : "password"} was typed ${plural(failed, "time")} before this unlock. If that wasn't you, someone may have tried to open Barry.`,
      );
    }
    setSession(next);
  }

  function lock(event: string, reason: LockReason = null) {
    if (session) drop(reason, event);
  }

  async function changeLock(secret: string, kind: SecretKind) {
    if (!session) return;
    try {
      const next = await changeSecret(session, snapshot(), secret, kind);
      replaceSession(next.session, next.data);
      setSession(next.session);
    } catch (error) {
      if (error instanceof StaleVault) drop("elsewhere");
      throw error;
    }
  }

  const unlocked = session !== null;
  const autoLock = useEffectEvent(() => lock("Locked after inactivity", "idle"));
  const onStorage = useEffectEvent((event: StorageEvent) => {
    if (session && event.storageArea === localStorage && changedElsewhere(session, event.key, event.newValue)) {
      drop("elsewhere");
    }
  });
  const leave = useEffectEvent(() => lock("Locked when you left Barry", "left"));

  useEffect(() => {
    if (!unlocked) return;
    const limit = (visiting ? VISIT_IDLE_MINUTES : IDLE_MINUTES) * MINUTE;
    // Timers are throttled in background tabs, so also check when the tab comes back.
    const check = () => {
      const idle = Date.now() - lastActive.current;
      if (idle > limit) autoLock();
      else setWarning(idle > limit - WARNING);
    };
    const options = { capture: true, passive: true };
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, touch, options));
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 5_000);
    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, touch, options));
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(timer);
    };
  }, [unlocked, visiting]);

  useEffect(() => {
    if (!unlocked) return;
    const listener = (event: StorageEvent) => onStorage(event);
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, [unlocked]);

  // Next keeps /app mounted but hidden after navigating away, and the browser may keep the page in its
  // back/forward cache, so lock instead of leaving health details in the page.
  useLayoutEffect(() => () => leave(), []);
  useEffect(() => {
    const listener = () => flushSync(() => leave());
    window.addEventListener("pagehide", listener);
    return () => window.removeEventListener("pagehide", listener);
  }, []);

  if (!session) return <Unlock owner={owner} lockedBy={lockedBy} onOpen={open} />;

  return (
    <LockControls value={{ lock: () => lock("Locked"), openPrivacy: () => setPrivacy(true), setVisiting, keepAlive: touch }}>
      {/* translate="no" keeps health details out of the browser's cloud page translation. */}
      <div translate="no" className="contents">
        {privacy ? (
          <div className="app-surface flex min-h-dvh flex-col bg-background">
            <Privacy
              log={currentLog()}
              kind={session.kind}
              account={account}
              onChangeSecret={changeLock}
              onBack={() => setPrivacy(false)}
              onErase={() => {
                eraseVault(owner);
                drop(null);
              }}
            />
          </div>
        ) : (
          <ChatApp />
        )}
        {notice && (
          <div role="alert" className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl items-start gap-3 rounded-xl border-[1.5px] border-foreground bg-background p-4 shadow-lg">
            <p className="flex-1 py-2.5">{notice}</p>
            <button className={button.quiet} onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </div>
        )}
        <Dialog open={warning} onClose={stay} label="Barry is about to lock" describedBy="lock-warning">
          <h2 className="text-2xl font-semibold tracking-tight">Still there?</h2>
          <p id="lock-warning" className="mt-3 text-lg">
            Barry locks in 1 minute to keep your information safe.
          </p>
          <button className={cn(button.primary, "mt-8 w-full")} onClick={stay}>
            Keep Barry open
          </button>
        </Dialog>
      </div>
    </LockControls>
  );
}
