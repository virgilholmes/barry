"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { IDLE_MINUTES, VISIT_IDLE_MINUTES, type LogEntry, type SecretKind } from "../_lib/vault";
import { ConfirmErase, TopBar, button } from "./ui";
import { SecretForm } from "./unlock";

// Each line describes what the code actually does. Keep them true when it changes.
const PROMISES = [
  {
    title: "Stays on this device",
    body: "Your health details are saved only in this browser. Barry never sends them anywhere. Your Barry account is only for signing in and never sees them. Barry has no ads and no tracking tools.",
  },
  {
    title: "Locked with your PIN or password",
    body: "Only your PIN or password can unlock it, so not even the people who made Barry can read it. A password is much harder to guess than a PIN. After 5 wrong tries, Barry makes you wait before trying again. (Technical detail: AES-256 encryption with a key made from your PIN or password.)",
  },
  {
    title: "Locks by itself",
    body: `Barry locks after ${IDLE_MINUTES} minutes without use, or ${VISIT_IDLE_MINUTES} minutes during a visit, and warns you a minute before. Leaving Barry, closing the page, or reloading it also locks it.`,
  },
  {
    title: "Listens privately",
    body: "During a visit, speech becomes text on this device. Barry never records sound. It keeps only your doctor's questions and your answers, and deletes them when the visit ends.",
  },
  {
    title: "Speaks with your device's own voice",
    body: "Barry only uses voices built into your device, so what it says out loud is never sent anywhere.",
  },
  {
    title: "Asks only for what helps",
    body: "Barry's questions never ask for your full name, birthday, address, or insurance. Your sign-in account may ask for your name, and signing in with Google or Apple shares your name with Clerk, the service Barry uses for signing in.",
  },
];

const LIMITS = [
  "Someone who can use this browser and knows or guesses your PIN or password. A PIN, or a short password, can be guessed from a copy of this device's data.",
  "Your browser's password manager, if it saved your PIN or password.",
  "Your keyboard's suggestions or voice typing, and screenshot tools on your device.",
  "Browser extensions you've installed, which can read pages you open.",
  "Changes to Barry's code, or to the sign-in code from Clerk that runs on this page.",
  "People who can see your screen or hear Barry.",
];

const formatTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function Privacy({
  log,
  kind,
  account,
  onBack,
  onErase,
  onChangeSecret,
}: {
  log: LogEntry[];
  kind: SecretKind;
  account: string;
  onBack: () => void;
  onErase: () => void;
  onChangeSecret: (secret: string, kind: SecretKind) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [changing, setChanging] = useState(false);
  const [changed, setChanged] = useState(false);
  const name = kind === "pin" ? "PIN" : "password";

  return (
    <>
      <TopBar>
        <button className={cn(button.quiet, "-ml-1")} onClick={onBack}>
          <ArrowLeft aria-hidden />
          Back
        </button>
      </TopBar>
      <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8">
        <h1 tabIndex={-1} className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Your privacy
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">Here&apos;s exactly what Barry does with your information.</p>

        <section aria-labelledby="promises" className="mt-10">
          <h2 id="promises" className="text-xl font-semibold">
            What Barry does
          </h2>
          <ul className="mt-4 grid gap-6">
            {PROMISES.map((promise) => (
              <li key={promise.title}>
                <h3 className="text-lg font-semibold">{promise.title}</h3>
                <p className="mt-1 text-lg text-muted-foreground">{promise.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="limits" className="mt-12">
          <h2 id="limits" className="text-xl font-semibold">
            What Barry can&apos;t protect against
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-lg text-muted-foreground">
            {LIMITS.map((limit) => (
              <li key={limit}>{limit}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="lock" className="mt-12">
          <h2 id="lock" className="text-xl font-semibold">
            Your PIN or password
          </h2>
          {changed && (
            <p role="status" className="mt-2 rounded-xl bg-muted p-4 text-lg">
              Barry is now locked with your new {name}.
            </p>
          )}
          {changing ? (
            <div className="mt-4 rounded-2xl border-[1.5px] p-5">
              <SecretForm
                account={account}
                submitLabel="Save and lock with it"
                busyLabel="Saving…"
                failMessage="Barry couldn't change it on this device. Your old PIN or password still works."
                onSubmit={async (secret, nextKind) => {
                  await onChangeSecret(secret, nextKind);
                  setChanging(false);
                  setChanged(true);
                }}
              >
                <p className="text-lg">Choose a new way to lock Barry. Everything is locked again with it.</p>
              </SecretForm>
              <button className={cn(button.outline, "mt-3 w-full")} onClick={() => setChanging(false)}>
                Keep my {name}
              </button>
            </div>
          ) : (
            <>
              <p className="mt-2 text-lg">Barry is locked with a {name}.</p>
              <button
                className={cn(button.outline, "mt-4")}
                onClick={() => {
                  setChanged(false);
                  setChanging(true);
                }}
              >
                Change PIN or password
              </button>
            </>
          )}
        </section>

        <section aria-labelledby="activity" className="mt-12">
          <h2 id="activity" className="text-xl font-semibold">
            Activity on this device
          </h2>
          <p className="mt-2 text-lg text-muted-foreground">
            When Barry was opened, locked, and changed, so you can spot anything you didn&apos;t do. It shows when visits
            started and ended, but not what you told Barry or what was said. Someone with access to this browser could
            erase it.
          </p>
          {log.length === 0 ? (
            <p className="mt-4 text-lg">No activity yet.</p>
          ) : (
            <ol className="mt-4 divide-y border-y">
              {log.toReversed().map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="grid gap-1 py-3 sm:flex sm:justify-between sm:gap-4">
                  <span className="text-lg">{entry.event}</span>
                  <time dateTime={new Date(entry.at).toISOString()} className="text-muted-foreground">
                    {formatTime.format(entry.at)}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="erase" className="mt-12 rounded-2xl border-[1.5px] border-destructive p-5">
          <h2 id="erase" className="text-xl font-semibold">
            Erase everything
          </h2>
          <p className="mt-2 text-lg">
            Erase everything Barry knows about you, and your PIN or password, from this device.
          </p>
          <button className={cn(button.danger, "mt-4")} onClick={() => setConfirming(true)}>
            Erase everything
          </button>
        </section>
      </main>
      <ConfirmErase open={confirming} onClose={() => setConfirming(false)} onErase={onErase} />
    </>
  );
}
