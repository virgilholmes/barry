"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { COMMUNICATION, FIELDS, display, isEmpty, type FieldKey } from "../_lib/profile";
import { useSpeech, useVoice } from "../_lib/voice";
import type { Profile } from "../_lib/vault";
import { Dialog, TopBar, button, field, phi } from "./ui";

const STEPS: { key: FieldKey; title: string; hint: string }[] = [
  {
    key: "name",
    title: "What should Barry call you?",
    hint: "A first name or a nickname is enough. You can leave this blank.",
  },
  {
    key: "conditions",
    title: "What health conditions do you have?",
    hint: "For example: cerebral palsy, epilepsy, or type 1 diabetes.",
  },
  {
    key: "medications",
    title: "What medicines do you take?",
    hint: "Include how much and how often, if you know.",
  },
  {
    key: "allergies",
    title: "Are you allergic to anything?",
    hint: "Medicines, foods, or latex, and what happens, like a rash. Write “None” if you have no allergies.",
  },
  {
    key: "communication",
    title: "How should people talk with you?",
    hint: "Pick anything that helps. Barry tells your doctor at the start of each visit.",
  },
  {
    key: "supporter",
    title: "Who helps you make decisions?",
    hint: "For example: my mom, Dana. Leave this blank if you decide on your own.",
  },
];

const REVIEW = STEPS.length;
const label = (key: FieldKey) => FIELDS.find((f) => f.key === key)!.label;
type TextKey = Exclude<FieldKey, "communication"> | "communicationNotes";

function append(current: string, words: string) {
  const next = words.trim();
  return current.trim() ? `${current.trimEnd()} ${next}` : next;
}

export function Brief({
  initial,
  onSave,
  onCancel,
  onDraft,
  onActivity,
}: {
  initial: Profile;
  onSave: (profile: Profile) => void;
  onCancel: () => void;
  onDraft: (profile: Profile) => void;
  onActivity: () => void;
}) {
  const [profile, setProfile] = useState(initial);
  const [step, setStep] = useState(isEmpty(initial) ? 0 : REVIEW);
  const [fromReview, setFromReview] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  // The field dictation started in; a phrase can finish after Next or Back has moved on.
  const dictatingInto = useRef<TextKey | null>(null);
  const voice = useVoice();

  const current = STEPS[step];
  const textKey: TextKey | null = current ? (current.key === "communication" ? "communicationNotes" : current.key) : null;
  const changed = profile !== initial;

  const speech = useSpeech((text) => {
    onActivity();
    const key = dictatingInto.current;
    if (key) setProfile((p) => ({ ...p, [key]: append(p[key], text) }));
  });

  // The app saves these if Barry locks before the review screen.
  const reportDraft = useEffectEvent((answers: Profile) => {
    if (answers !== initial) onDraft(answers);
  });
  useEffect(() => reportDraft(profile), [profile]);

  // Move focus to each new question so screen readers start there.
  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  function go(next: number) {
    speech.stop();
    setStep(next);
  }

  function edit(index: number) {
    setFromReview(true);
    go(index);
  }

  function cancel() {
    if (changed) setLeaving(true);
    else onCancel();
  }

  const leaveDialog = (
    <Dialog open={leaving} onClose={() => setLeaving(false)} label="Leave without saving" describedBy="leave-warning">
      <h2 className="text-2xl font-semibold tracking-tight">Leave without saving?</h2>
      <p id="leave-warning" className="mt-3 text-lg">
        The answers you changed won&apos;t be kept.
      </p>
      <div className="mt-8 flex flex-col-reverse gap-6 sm:flex-row sm:justify-end">
        <button className={button.outline} onClick={() => setLeaving(false)}>
          Keep editing
        </button>
        <button className={button.danger} onClick={onCancel}>
          Leave without saving
        </button>
      </div>
    </Dialog>
  );

  if (!current) {
    return (
      <>
        <TopBar>
          <Logo className="h-6" />
        </TopBar>
        <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8">
          <h1 ref={heading} tabIndex={-1} className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Check what Barry knows
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Barry uses this at every visit. You can change it at any time.
          </p>
          <dl className="mt-8 divide-y border-y">
            {STEPS.map((s, index) => {
              const value = display(profile, s.key);
              return (
                <div key={s.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 py-4">
                  <dt className="font-medium text-muted-foreground">{label(s.key)}</dt>
                  <dd className={cn("mt-1 text-lg break-words whitespace-pre-wrap", !value && "text-muted-foreground")}>
                    {value || "Not added"}
                  </dd>
                  <dd className="col-start-2 row-span-2 row-start-1">
                    <button
                      className={button.outline}
                      aria-label={`Change ${label(s.key).toLowerCase()}`}
                      onClick={() => edit(index)}
                    >
                      Change
                    </button>
                  </dd>
                </div>
              );
            })}
          </dl>
          <div className="mt-10 flex flex-col-reverse gap-6 sm:flex-row sm:justify-end">
            <button className={button.outline} onClick={cancel}>
              Cancel
            </button>
            <button className={button.primary} onClick={() => onSave(profile)}>
              Save
            </button>
          </div>
        </main>
        {leaveDialog}
      </>
    );
  }

  const value = textKey ? profile[textKey] : "";
  const filled = display(profile, current.key) !== "";

  return (
    <>
      <TopBar>
        <Logo className="h-6" />
        <button className={cn(button.quiet, "ml-auto")} onClick={cancel}>
          Cancel
        </button>
      </TopBar>
      <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8">
        <p aria-hidden className="font-medium text-muted-foreground">
          Question {step + 1} of {STEPS.length}
        </p>
        <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-foreground" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        <h1
          id="question"
          ref={heading}
          tabIndex={-1}
          className="mt-8 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
        >
          <span className="sr-only">
            Question {step + 1} of {STEPS.length}:{" "}
          </span>
          {current.title}
        </h1>
        <p id="hint" className="mt-3 text-lg text-muted-foreground">
          {current.hint}
        </p>

        {current.key === "communication" && (
          <fieldset className="mt-6">
            <legend className="sr-only">{current.title}</legend>
            <div className="grid gap-2">
              {COMMUNICATION.map((option) => (
                <label
                  key={option.id}
                  className="flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border-[1.5px] border-control px-4 py-2 text-lg has-checked:border-foreground has-checked:bg-muted"
                >
                  <input
                    type="checkbox"
                    className="size-6 shrink-0 accent-foreground"
                    checked={profile.communication.includes(option.id)}
                    onChange={(event) =>
                      setProfile((p) => ({
                        ...p,
                        communication: event.target.checked
                          ? [...p.communication, option.id]
                          : p.communication.filter((id) => id !== option.id),
                      }))
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {textKey && (
          <div className="mt-6">
            {current.key === "communication" && (
              <label htmlFor="answer" className="mb-2 block text-lg font-medium">
                Anything else your doctor should know?
              </label>
            )}
            {current.key === "name" ? (
              <input
                id="answer"
                {...phi}
                aria-labelledby="question"
                aria-describedby="hint"
                maxLength={60}
                value={value}
                onChange={(event) => setProfile((p) => ({ ...p, name: event.target.value }))}
                className={cn(field, "min-h-14")}
              />
            ) : (
              <textarea
                id="answer"
                {...phi}
                aria-labelledby={current.key === "communication" ? undefined : "question"}
                aria-describedby="hint"
                rows={4}
                maxLength={2000}
                value={value}
                onChange={(event) => setProfile((p) => ({ ...p, [textKey]: event.target.value }))}
                className={cn(field, "resize-y")}
              />
            )}
            <Dictation
              voice={voice}
              listening={speech.listening}
              onStart={() => {
                dictatingInto.current = textKey;
                speech.start();
              }}
              onStop={speech.stop}
            />
            {/* A fixed slot, so the buttons below don't jump while words arrive. */}
            {speech.listening && (
              <p className="mt-3 h-7 truncate text-lg text-muted-foreground">{speech.heard && `Hearing: ${speech.heard}`}</p>
            )}
            {speech.error && (
              <p role="alert" className="mt-3 font-semibold text-destructive">
                {speech.error}
              </p>
            )}
          </div>
        )}

        <div className="mt-10 flex gap-3">
          {step > 0 && !fromReview && (
            <button className={button.outline} onClick={() => go(step - 1)}>
              Back
            </button>
          )}
          <button className={cn(button.primary, "ml-auto min-w-32")} onClick={() => go(fromReview ? REVIEW : step + 1)}>
            {fromReview ? "Done" : filled ? "Next" : "Skip"}
          </button>
        </div>
      </main>
      {leaveDialog}
    </>
  );
}

function Dictation({
  voice,
  listening,
  onStart,
  onStop,
}: {
  voice: ReturnType<typeof useVoice>;
  listening: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  if (voice.status === "available") {
    return (
      <button
        className={cn(button.outline, "mt-3", listening && "border-foreground bg-muted")}
        onClick={listening ? onStop : onStart}
      >
        {listening ? <Square aria-hidden /> : <Mic aria-hidden />}
        {listening ? "I'm done speaking" : "Speak your answer"}
      </button>
    );
  }
  if (voice.status === "downloadable" || voice.status === "downloading") {
    return (
      <div className="mt-3">
        <button className={button.outline} onClick={voice.install} aria-busy={voice.status === "downloading"}>
          <Mic aria-hidden />
          {voice.status === "downloading" ? "Turning on listening…" : "Turn on listening"}
        </button>
        <p className="mt-2 text-base text-muted-foreground">
          Barry needs a one-time download to listen on this device. Sound never leaves this device.
        </p>
      </div>
    );
  }
  if (voice.status === "unavailable") {
    return (
      <p className="mt-3 text-base text-muted-foreground">
        Speaking answers is off because this browser can&apos;t turn speech into text on your device.
      </p>
    );
  }
  return null;
}
