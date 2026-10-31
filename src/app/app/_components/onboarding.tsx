"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Check, Mic, Plus, Square, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import {
  COMMUNICATION_PREFERENCES,
  countDetails,
  type Allergy,
  type Condition,
  type Medication,
  type Profile,
  type Supporter,
} from "@/lib/profile";
import { getProfile, setOnboarded, updateProfile, useProfile } from "../_lib/profile-store";
import { speak, stopSpeaking } from "../_lib/speak";
import { useVoiceInput } from "../_lib/use-voice-input";

type ListSection = "medications" | "allergies" | "conditions" | "support";

type Step =
  | { id: "welcome" | "name" | "communication" | "notes" | "done" }
  | { id: ListSection; none: string; placeholder: string };

const STEPS: Step[] = [
  { id: "welcome" },
  { id: "name" },
  { id: "communication" },
  { id: "medications", none: "I don't take any", placeholder: "Metformin 500 mg twice a day" },
  { id: "allergies", none: "No allergies", placeholder: "Penicillin, it gives me hives" },
  { id: "conditions", none: "None to add", placeholder: "Cerebral palsy" },
  { id: "support", none: "No, just me", placeholder: "My mom Jane helps me decide things" },
  { id: "notes" },
  { id: "done" },
];

const COPY: Record<Step["id"], { question: string; hint: string }> = {
  welcome: {
    question: "Hi, I'm Barry.",
    hint: "I come to your appointments with you, so you never have to repeat your story. Let's get to know each other. It takes about two minutes.",
  },
  name: { question: "What should I call you?", hint: "Say it or type it." },
  communication: {
    question: "How should people talk to you?",
    hint: "Pick any that help. I'll ask your care team to do the same.",
  },
  medications: {
    question: "Do you take any medicines?",
    hint: "Tell me the name, and the dose and when if you know them. Add as many as you like.",
  },
  allergies: { question: "Are you allergic to anything?", hint: "Like a medicine or a food, and what happens." },
  conditions: {
    question: "Do you have any health conditions?",
    hint: "Anything you'd like your care team to know about.",
  },
  support: {
    question: "Does anyone help you at appointments?",
    hint: "Like a parent, partner or carer. Tell me if they help you make decisions.",
  },
  notes: {
    question: "Anything else your care team should know?",
    hint: "Like “I get anxious with needles” or “Please explain things before you do them.”",
  },
  done: { question: "Thanks. I'm ready to come with you.", hint: "You can change any of this in What Barry Knows." },
};

function cleanName(text: string) {
  const name = text
    .replace(/^(hi|hello|hey)[,.!\s]+/i, "")
    .replace(/^(my name is|my name's|i'm|i am|call me|it's|it is|this is)(\s+|$)/i, "")
    .replace(/[.!?,]+$/, "")
    .trim();
  return name.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

export function Onboarding({ onFinish }: { onFinish: (next: "home" | "profile" | "room") => void }) {
  const profile = useProfile();
  const [index, setIndex] = useState(0);
  const [readAloud, setReadAloud] = useState(true);
  const step = STEPS[index];
  const copy = COPY[step.id];
  const name = profile.name.trim();
  const question = step.id === "done" && name ? `Thanks, ${name}. I'm ready to come with you.` : copy.question;

  // Read each question aloud. Browsers only allow speech after a tap, which
  // the "Let's start" button provides.
  useEffect(() => {
    if (readAloud && index > 0) void speak(`${question} ${step.id === "name" ? "" : copy.hint}`);
    return stopSpeaking;
  }, [index, readAloud, question, copy.hint, step.id]);

  function next() {
    setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function finish(target: "home" | "profile" | "room") {
    stopSpeaking();
    setOnboarded(true);
    onFinish(target);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center gap-4 px-5 sm:px-8">
        <Logo className="h-6" />
        <div className="mx-auto hidden h-1 w-full max-w-xs overflow-hidden rounded-full bg-stone-100 sm:block">
          <div
            className="h-full rounded-full bg-orange-500 transition-[width] duration-500"
            style={{ width: `${(index / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <Button
            variant="ghost"
            size="icon"
            aria-label={readAloud ? "Stop reading questions aloud" : "Read questions aloud"}
            aria-pressed={readAloud}
            title={readAloud ? "Reading questions aloud" : "Read questions aloud"}
            onClick={() => setReadAloud(!readAloud)}
            className="text-muted-foreground"
          >
            {readAloud ? <Volume2 className="size-[18px]" /> : <VolumeX className="size-[18px]" />}
          </Button>
          {step.id !== "done" && (
            <Button variant="ghost" onClick={() => finish("home")} className="text-muted-foreground">
              Skip for now
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div key={step.id} className="mx-auto w-full max-w-xl px-6 pt-10 pb-10 duration-300 animate-in fade-in slide-in-from-bottom-2 sm:pt-20">
          {step.id !== "welcome" && step.id !== "done" && (
            <p className="text-sm font-medium text-orange-600">
              {index} of {STEPS.length - 2}
            </p>
          )}
          {step.id === "welcome" && (
            <span className="mb-8 grid size-16 place-items-center rounded-full bg-orange-500 text-white">
              <Volume2 className="size-7" />
            </span>
          )}
          <h1 className="mt-2 text-[34px] leading-tight font-semibold tracking-tight text-balance sm:text-[40px]">
            {question}
          </h1>
          <p className="mt-3 text-lg text-pretty text-muted-foreground">{copy.hint}</p>

          <div className="mt-10">
            {step.id === "welcome" && (
              <Button
                onClick={next}
                className="h-14 w-full rounded-2xl bg-orange-500 text-lg text-white hover:bg-orange-600 sm:w-auto sm:px-10"
              >
                Let&apos;s start
              </Button>
            )}
            {step.id === "name" && <NameStep onNext={next} />}
            {step.id === "communication" && <CommunicationStep profile={profile} />}
            {"none" in step && <ListStep key={step.id} section={step.id} placeholder={step.placeholder} profile={profile} />}
            {step.id === "notes" && <NotesStep profile={profile} />}
            {step.id === "done" && <Done profile={profile} onFinish={finish} />}
          </div>
        </div>
      </main>

      {step.id !== "welcome" && step.id !== "done" && (
        <footer className="border-t border-stone-200/70 px-6 py-4">
          <div className="mx-auto flex w-full max-w-xl items-center gap-3">
            <Button variant="ghost" onClick={() => setIndex(index - 1)} className="h-12 rounded-xl px-4">
              <ArrowLeft />
              Back
            </Button>
            <div className="flex-1" />
            {"none" in step && profile[step.id].length === 0 && (
              <Button variant="outline" onClick={next} className="h-12 rounded-xl px-4">
                {step.none}
              </Button>
            )}
            <Button
              onClick={next}
              disabled={step.id === "name" && !name}
              className="h-12 rounded-xl bg-orange-500 px-6 text-base text-white hover:bg-orange-600 disabled:bg-stone-200 disabled:text-stone-500 disabled:opacity-100"
            >
              {step.id === "notes" && !profile.share.notes.trim() ? "Skip" : "Continue"}
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}

function VoiceButton({ listening, onClick }: { listening: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={listening ? "Stop listening" : "Answer by talking"}
      className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-orange-500 text-white transition-colors hover:bg-orange-600"
    >
      {listening && (
        <span aria-hidden className="absolute inset-0 animate-ping rounded-xl bg-orange-500/40 motion-reduce:hidden" />
      )}
      {listening ? <Square className="relative size-4 fill-current" /> : <Mic className="relative size-5" />}
    </button>
  );
}

function ListeningNote({ listening, error }: { listening: boolean; error: string | null }) {
  if (error) return <p className="mt-2 text-sm text-red-700">{error}</p>;
  if (!listening) return null;
  return <p className="mt-2 text-sm text-orange-700">Listening… I&apos;ll stop when you pause.</p>;
}

function NameStep({ onNext }: { onNext: () => void }) {
  const profile = useProfile();
  const { user } = useUser();
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? (profile.name || user?.firstName || "");
  const voice = useVoiceInput({
    onText: (text) => setDraft(cleanName(text)),
    onDone: (text) => save(cleanName(text)),
  });

  function save(name: string) {
    setDraft(name);
    updateProfile((current) => ({ ...current, name: name.trim() }));
  }

  // Save the name from their account as a starting point, so Continue works right away.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!prefilled.current && !profile.name && draft === null && user?.firstName) {
      prefilled.current = true;
      updateProfile((current) => ({ ...current, name: user.firstName ?? "" }));
    }
  }, [profile.name, draft, user?.firstName]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) onNext();
      }}
    >
      <div className="flex items-center gap-2 rounded-2xl border border-stone-200 p-2 focus-within:border-stone-400">
        <input
          autoFocus
          value={value}
          onChange={(event) => save(event.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          className="h-12 min-w-0 flex-1 bg-transparent px-3 text-xl outline-none placeholder:text-stone-400"
        />
        <VoiceButton listening={voice.listening} onClick={voice.toggle} />
      </div>
      <ListeningNote listening={voice.listening} error={voice.error} />
    </form>
  );
}

function CommunicationStep({ profile }: { profile: Profile }) {
  const selected = profile.communication.preferences;

  function toggle(id: string) {
    updateProfile((current) => ({
      ...current,
      communication: {
        ...current.communication,
        preferences: current.communication.preferences.includes(id)
          ? current.communication.preferences.filter((p) => p !== id)
          : [...current.communication.preferences, id],
      },
    }));
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {COMMUNICATION_PREFERENCES.map((preference) => {
        const on = selected.includes(preference.id);
        return (
          <button
            key={preference.id}
            onClick={() => toggle(preference.id)}
            aria-pressed={on}
            className={cn(
              "flex min-h-16 items-center gap-3 rounded-2xl border px-4 py-3 text-left text-[15px] transition-colors",
              on ? "border-orange-500 bg-orange-50 text-stone-900" : "border-stone-200 hover:border-stone-300",
            )}
          >
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border",
                on ? "border-orange-500 bg-orange-500 text-white" : "border-stone-300",
              )}
            >
              {on && <Check className="size-3.5" strokeWidth={3} />}
            </span>
            {preference.label}
          </button>
        );
      })}
    </div>
  );
}

type Extracted = {
  medications: Omit<Medication, "id">;
  allergies: Omit<Allergy, "id">;
  conditions: Omit<Condition, "id">;
  support: Omit<Supporter, "id">;
};

function fallbackItem(section: ListSection, text: string): Extracted[ListSection] {
  switch (section) {
    case "medications":
      return { name: text, dose: "", schedule: "", reason: "" };
    case "allergies":
      return { substance: text, reaction: "", severity: "" };
    case "conditions":
      return { name: text, notes: "" };
    case "support":
      return { name: text, relationship: "", phone: "", decides: false };
  }
}

function describeItem(section: ListSection, item: Profile[ListSection][number]) {
  const parts = (...values: string[]) => values.filter((v) => v.trim()).join(" · ");
  switch (section) {
    case "medications": {
      const m = item as Medication;
      return { title: m.name, detail: parts(m.dose, m.schedule, m.reason && `for ${m.reason}`) };
    }
    case "allergies": {
      const a = item as Allergy;
      return { title: a.substance, detail: parts(a.reaction, a.severity) };
    }
    case "conditions": {
      const c = item as Condition;
      return { title: c.name, detail: c.notes };
    }
    case "support": {
      const s = item as Supporter;
      return { title: s.name, detail: parts(s.relationship, s.phone, s.decides ? "helps decide" : "") };
    }
  }
}

function ListStep({ section, placeholder, profile }: { section: ListSection; placeholder: string; profile: Profile }) {
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const voice = useVoiceInput({ onText: setDraft, onDone: (text) => add(text) });
  const items = profile[section] as Profile[ListSection];

  async function add(text: string) {
    const said = text.trim();
    if (!said || adding) return;
    setAdding(true);
    setError(null);
    let extracted: Extracted[ListSection][] = [];
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, text: said }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      extracted = data.items;
      if (extracted.length === 0) setError("Got it, nothing to add. If I misheard, try again or type it.");
    } catch {
      // Keep their words rather than losing them.
      extracted = [fallbackItem(section, said)];
    }
    if (extracted.length > 0) {
      updateProfile((current) => ({
        ...current,
        [section]: [
          ...(current[section] as Profile[ListSection]),
          ...extracted.map((item) => ({ ...item, id: crypto.randomUUID() })),
        ],
      }));
      setDraft("");
    }
    setAdding(false);
  }

  function remove(id: string) {
    updateProfile((current) => ({
      ...current,
      [section]: (current[section] as Profile[ListSection]).filter((item) => item.id !== id),
    }));
  }

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void add(draft);
        }}
      >
        <div className="flex items-center gap-2 rounded-2xl border border-stone-200 p-2 focus-within:border-stone-400">
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
            aria-label={COPY[section].question}
            disabled={adding}
            className="h-12 min-w-0 flex-1 bg-transparent px-3 text-lg outline-none placeholder:text-stone-400"
          />
          {draft.trim() && !voice.listening && (
            <Button type="submit" variant="ghost" disabled={adding} className="h-12 rounded-xl px-3">
              <Plus />
              {adding ? "Adding…" : "Add"}
            </Button>
          )}
          <VoiceButton listening={voice.listening} onClick={voice.toggle} />
        </div>
      </form>
      <ListeningNote listening={voice.listening} error={voice.error ?? error} />
      {adding && !voice.listening && <p className="mt-2 text-sm text-muted-foreground">Adding that to your profile…</p>}

      {items.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {items.map((item) => {
            const { title, detail } = describeItem(section, item);
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-2xl bg-stone-100 py-3 pr-2 pl-4 duration-300 animate-in fade-in"
              >
                <Check className="size-4 shrink-0 text-orange-600" strokeWidth={3} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{title}</p>
                  {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
                </div>
                <button
                  aria-label={`Remove ${title}`}
                  onClick={() => remove(item.id)}
                  className="grid size-9 place-items-center rounded-lg text-stone-400 hover:bg-stone-200 hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function NotesStep({ profile }: { profile: Profile }) {
  const base = useRef("");
  const voice = useVoiceInput({
    onText: (text) => setNotes(base.current ? `${base.current} ${text}` : text),
  });

  function setNotes(notes: string) {
    updateProfile((current) => ({ ...current, share: { ...current.share, notes } }));
  }

  return (
    <div>
      <div className="flex items-start gap-2 rounded-2xl border border-stone-200 p-2 focus-within:border-stone-400">
        <textarea
          autoFocus
          value={profile.share.notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Anything you'd like Barry to share"
          aria-label={COPY.notes.question}
          rows={3}
          className="field-sizing-content min-h-28 min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-lg outline-none placeholder:text-stone-400"
        />
        <VoiceButton
          listening={voice.listening}
          onClick={() => {
            base.current = getProfile().share.notes.trim();
            void voice.toggle();
          }}
        />
      </div>
      <ListeningNote listening={voice.listening} error={voice.error} />
    </div>
  );
}

function Done({ profile, onFinish }: { profile: Profile; onFinish: (next: "home" | "profile" | "room") => void }) {
  const total = countDetails(profile) - (profile.name.trim() ? 1 : 0);
  const rows = [
    ["Medicines", profile.medications.map((m) => m.name)],
    ["Allergies", profile.allergies.map((a) => a.substance)],
    ["Conditions", profile.conditions.map((c) => c.name)],
    ["People who help you", profile.support.map((s) => s.name)],
  ] as const;

  return (
    <div>
      {total > 0 && (
        <dl className="divide-y divide-stone-200/70 border-y border-stone-200/70">
          {rows
            .filter(([, items]) => items.length > 0)
            .map(([title, items]) => (
              <div key={title} className="flex gap-4 py-3">
                <dt className="w-40 shrink-0 text-muted-foreground">{title}</dt>
                <dd className="font-medium">{items.join(", ")}</dd>
              </div>
            ))}
        </dl>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={() => onFinish("home")}
          className="h-14 rounded-2xl bg-orange-500 px-8 text-lg text-white hover:bg-orange-600"
        >
          Start using Barry
        </Button>
        <Button variant="outline" onClick={() => onFinish("profile")} className="h-14 rounded-2xl px-6 text-base">
          Review my profile
        </Button>
      </div>
    </div>
  );
}
