"use client";

import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";
import { Lock, Mic } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { FIELDS, display, isEmpty } from "../_lib/profile";
import {
  IDLE_MINUTES,
  StaleVault,
  VISIT_IDLE_MINUTES,
  changeSecret,
  changedElsewhere,
  eraseVault,
  saveVault,
  withLog,
  type Profile,
  type SecretKind,
  type Session,
  type VaultData,
} from "../_lib/vault";
import { Brief } from "./brief";
import { Privacy } from "./privacy";
import { Dialog, Notice, TopBar, button } from "./ui";
import { Unlock, useAccountName, type LockReason, type Opened } from "./unlock";
import { Visit } from "./visit";

const MINUTE = 60_000;
// WCAG 2.2.1 needs a warning at least 20 seconds before a time limit.
const WARNING = MINUTE;
// Screen readers and switch devices may only send click or input, so those count as use too.
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "click", "input"];

type Screen = "home" | "brief" | "visit" | "privacy";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

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
  return <App key={userId} owner={userId} />;
}

function App({ owner }: { owner: string }) {
  const [vault, setVault] = useState<{ session: Session; data: VaultData } | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [visiting, setVisiting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [warning, setWarning] = useState(false);
  const [lockedBy, setLockedBy] = useState<LockReason>(null);
  const lastActive = useRef(0);
  // Briefing answers not saved yet, so locking in the middle of a briefing keeps them.
  const draft = useRef<Profile | null>(null);
  const account = useAccountName(owner);

  const touch = () => {
    lastActive.current = Date.now();
  };

  function stay() {
    touch();
    setWarning(false);
  }

  // Forget everything decrypted, without saving.
  function drop(reason: LockReason) {
    draft.current = null;
    setVault(null);
    setScreen("home");
    setVisiting(false);
    setNotice(null);
    setSaveFailed(false);
    setWarning(false);
    setLockedBy(reason);
  }

  function persist(session: Session, data: VaultData) {
    setVault({ session, data });
    saveVault(session, data).then(
      () => setSaveFailed(false),
      (error) => (error instanceof StaleVault ? drop("elsewhere") : setSaveFailed(true)),
    );
  }

  function record(event: string, change: (data: VaultData) => VaultData = (data) => data) {
    if (vault) persist(vault.session, withLog(change(vault.data), event));
  }

  function open({ session, data, failed, created }: Opened) {
    touch();
    setLockedBy(null);
    if (created) {
      setVault({ session, data });
    } else {
      persist(session, withLog(data, failed ? `Unlocked after ${plural(failed, "wrong try", "wrong tries")}` : "Unlocked"));
    }
    if (failed) {
      setNotice(
        `The wrong ${session.kind === "pin" ? "PIN" : "password"} was typed ${plural(failed, "time")} before this unlock. If that wasn't you, someone may have tried to open Barry.`,
      );
    }
    setScreen(created ? "brief" : "home");
  }

  async function changeLock(secret: string, kind: SecretKind) {
    if (!vault) return;
    try {
      setVault(await changeSecret(vault.session, vault.data, secret, kind));
    } catch (error) {
      if (error instanceof StaleVault) drop("elsewhere");
      throw error;
    }
  }

  function lock(event: string, reason: LockReason = null) {
    if (!vault) return;
    const answers = draft.current;
    const data = answers ? { ...vault.data, profile: answers } : vault.data;
    // A stale tab's save is refused by the vault, so this can't overwrite newer data.
    saveVault(vault.session, withLog(data, answers ? `${event} and saved your answers` : event)).catch(() => {});
    drop(reason);
  }

  const unlocked = vault !== null;
  const autoLock = useEffectEvent(() => lock("Locked after inactivity", "idle"));
  const onStorage = useEffectEvent((event: StorageEvent) => {
    if (vault && event.storageArea === localStorage && changedElsewhere(vault.session, event.key, event.newValue)) {
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

  // Each new screen starts at its heading for keyboard and screen reader users.
  useEffect(() => {
    if (unlocked) document.querySelector<HTMLElement>("main h1")?.focus();
  }, [screen, unlocked]);

  if (!vault) return <Unlock owner={owner} lockedBy={lockedBy} onOpen={open} />;

  const { profile, log } = vault.data;

  // translate="no" keeps health details out of the browser's cloud page translation.
  return (
    <div translate="no" className="flex min-h-dvh flex-col">
      {screen === "brief" && (
        <Brief
          initial={profile}
          onActivity={touch}
          onDraft={(answers) => {
            draft.current = answers;
          }}
          onCancel={() => {
            draft.current = null;
            setScreen("home");
          }}
          onSave={(next) => {
            draft.current = null;
            record("Updated your information", (data) => ({ ...data, profile: next }));
            setScreen("home");
          }}
        />
      )}
      {screen === "visit" && (
        <Visit
          profile={profile}
          onActivity={touch}
          onStart={() => {
            setVisiting(true);
            record("Started a visit");
          }}
          onExit={(started) => {
            setVisiting(false);
            if (started) record("Ended a visit and deleted its notes");
            setScreen("home");
          }}
        />
      )}
      {screen === "privacy" && (
        <Privacy
          log={log}
          kind={vault.session.kind}
          account={account}
          onChangeSecret={changeLock}
          onBack={() => setScreen("home")}
          onErase={() => {
            eraseVault(owner);
            drop(null);
          }}
        />
      )}
      {screen === "home" && (
        <Home
          profile={profile}
          notice={notice}
          saveFailed={saveFailed}
          onDismissNotice={() => setNotice(null)}
          onGo={setScreen}
          onLock={() => lock("Locked")}
        />
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
  );
}

function Home({
  profile,
  notice,
  saveFailed,
  onDismissNotice,
  onGo,
  onLock,
}: {
  profile: Profile;
  notice: string | null;
  saveFailed: boolean;
  onDismissNotice: () => void;
  onGo: (screen: Screen) => void;
  onLock: () => void;
}) {
  const empty = isEmpty(profile);
  const name = profile.name.trim();

  return (
    <>
      <TopBar>
        <Logo className="h-6" />
        <nav aria-label="Barry" className="ml-auto flex items-center gap-1">
          <button className={button.quiet} onClick={() => onGo("privacy")}>
            Privacy
          </button>
          <button className={button.quiet} onClick={onLock}>
            <Lock aria-hidden />
            Lock
          </button>
          <span className="ml-1 flex">
            <UserButton />
          </span>
        </nav>
      </TopBar>

      <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8">
        {saveFailed && (
          <Notice>
            Barry couldn&apos;t save your latest change on this device. Keep Barry open and try again, or check that this
            browser has storage space.
          </Notice>
        )}
        {notice && <Notice onDismiss={onDismissNotice}>{notice}</Notice>}

        <h1 tabIndex={-1} className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {name ? `Hi, ${name}.` : "Hi there."}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          When your appointment starts, tap Start a doctor visit. Barry will listen with you.
        </p>
        <button
          className={cn(button.primary, "mt-6 min-h-16 w-full text-lg sm:w-auto sm:px-8")}
          onClick={() => onGo("visit")}
        >
          <Mic aria-hidden />
          Start a doctor visit
        </button>

        <section aria-labelledby="known" className="mt-14">
          <div className="flex items-center justify-between gap-4 border-b pb-3">
            <h2 id="known" className="text-xl font-semibold">
              What Barry knows about you
            </h2>
            <button className={button.outline} onClick={() => onGo("brief")}>
              {empty ? "Tell Barry" : "Change"}
            </button>
          </div>
          {empty ? (
            <p className="py-6 text-lg">
              Nothing yet. Tell Barry about your health and how you like to communicate, and you won&apos;t have to
              explain it again at every visit.
            </p>
          ) : (
            <dl className="divide-y">
              {FIELDS.map(({ key, label }) => {
                const value = display(profile, key);
                return (
                  <div key={key} className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
                    <dt className="font-medium text-muted-foreground">{label}</dt>
                    <dd className={cn("text-lg break-words whitespace-pre-wrap", !value && "text-muted-foreground")}>
                      {value || "Not added"}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </section>

        <p className="mt-14 text-base text-muted-foreground">
          Barry doesn&apos;t give medical advice. Check anything important with your care team.
        </p>
      </main>
    </>
  );
}
