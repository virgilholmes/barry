"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AudioLines, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { sharedDetails, type Profile } from "@/lib/profile";
import { listeningSupported, startListening, type Listener } from "../_lib/listen";
import { getProfile, useProfile } from "../_lib/profile-store";
import { speak, stopSpeaking } from "../_lib/speak";
import { saveVisit, startTime, type VisitSummary } from "../_lib/visits-store";
import { Switch } from "./profile-view";

type Route = "answer" | "ask" | "patient";

type Card = {
  id: string;
  route: Route;
  question: string;
  simple: string;
  answer: string | null;
  options: { label: string; say: string }[];
  chosen: string | null;
};

type Line = { who: "room" | "barry" | "me"; text: string };

const PHRASES = [
  { text: "Please slow down." },
  { text: "Can you say that again?", unclear: true },
  { text: "Please use simpler words.", unclear: true },
  { text: "Please talk to me directly." },
  { text: "I need a moment." },
];

const LABELS: Record<Route, string> = {
  answer: "Barry answered for you",
  ask: "Tap your answer",
  patient: "For you to answer",
};

const noop = () => () => {};

function formatLine(line: Line) {
  return line.who === "room" ? line.text : `${line.who === "barry" ? "Barry" : "Me"}: ${line.text}`;
}

function helperFor(profile: Profile) {
  const person = profile.support.find((s) => s.decides) ?? profile.support[0];
  if (!person) return null;
  const relationship = person.relationship.trim().toLowerCase();
  return {
    label: person.name,
    spoken: relationship ? `my ${relationship}, ${person.name}` : person.name,
  };
}

export function RoomView({ onFinish, onEditProfile }: { onFinish: (visitId: string) => void; onEditProfile: () => void }) {
  const profile = useProfile();
  const supported = useSyncExternalStore(noop, listeningSupported, () => false);
  const [phase, setPhase] = useState<"intro" | "live" | "ending">("intro");
  const [listeningState, setListeningState] = useState<"starting" | "listening" | "failed">("starting");
  const [consent, setConsent] = useState(false);
  const [autoAnswer, setAutoAnswer] = useState(true);
  const [lastHeard, setLastHeard] = useState("");
  const [partial, setPartial] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [flaggedCount, setFlaggedCount] = useState(0);

  const live = useRef(false);
  const startedAt = useRef(0);
  const listener = useRef<Listener | null>(null);
  const lines = useRef<Line[]>([]);
  const flagged = useRef<string[]>([]);
  const pending = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const busy = useRef(false);
  const again = useRef(false);
  const voices = useRef(0);
  const muted = useRef(false);
  const autoAnswerRef = useRef(autoAnswer);

  useEffect(() => {
    autoAnswerRef.current = autoAnswer;
  }, [autoAnswer]);

  useEffect(
    () => () => {
      live.current = false;
      clearTimeout(timer.current);
      listener.current?.abort();
      stopSpeaking();
    },
    [],
  );

  // Barry's own voice gets picked up by the mic, so ignore what's heard while he talks.
  async function say(text: string, who: "barry" | "me" = "me") {
    lines.current.push({ who, text });
    voices.current++;
    muted.current = true;
    setSpeaking(true);
    await speak(text);
    voices.current--;
    if (voices.current === 0) {
      setSpeaking(false);
      setTimeout(() => {
        if (voices.current === 0) muted.current = false;
      }, 600);
    }
  }

  // Remembers what was being said when the patient got lost, for the summary.
  function flagUnclear() {
    const recent = lines.current
      .filter((line) => line.who === "room")
      .slice(-2)
      .map((line) => line.text)
      .join(" ");
    flagged.current.push(recent || "Something early in the appointment");
    setFlaggedCount(flagged.current.length);
  }

  async function start() {
    live.current = true;
    startedAt.current = startTime();
    setPhase("live");
    await listen();
  }

  async function listen() {
    listener.current?.abort();
    listener.current = null;
    setError(null);
    setListeningState("starting");
    let failed = false;
    try {
      const started = await startListening("room", {
        onPartial: (text) => {
          if (!muted.current) setPartial(text);
        },
        onFinal: (text) => {
          if (muted.current) return;
          lines.current.push({ who: "room", text });
          setLastHeard(text);
          setPartial("");
          pending.current = `${pending.current} ${text}`.trim();
          clearTimeout(timer.current);
          if (live.current) timer.current = setTimeout(classify, text.trim().endsWith("?") ? 150 : 900);
        },
        onError: (message) => {
          failed = true;
          setError(message);
          setListeningState("failed");
          listener.current?.abort();
        },
      });
      if (live.current && !failed) {
        listener.current = started;
        setListeningState("listening");
      } else started.abort();
    } catch (err) {
      setListeningState("failed");
      setError(err instanceof Error ? err.message : "Barry couldn't start listening.");
    }
  }

  async function classify() {
    if (busy.current) {
      again.current = true;
      return;
    }
    const latest = pending.current.slice(-2000);
    if (!latest) return;
    pending.current = "";
    busy.current = true;
    try {
      const response = await fetch("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "classify",
          latest,
          context: lines.current.slice(-12).map((line) => formatLine(line).slice(0, 2000)),
          profile: getProfile(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!live.current || !data.route) return;
      const card: Card = { id: crypto.randomUUID(), ...data, chosen: null };
      setCards((current) => [card, ...current]);
      if (card.route === "answer" && card.answer && autoAnswerRef.current) void say(card.answer, "barry");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Barry couldn't follow that part.");
    } finally {
      busy.current = false;
      if (again.current) {
        again.current = false;
        void classify();
      }
    }
  }

  function choose(card: Card, option: Card["options"][number]) {
    setCards((current) => current.map((c) => (c.id === card.id ? { ...c, chosen: option.label } : c)));
    void say(option.say);
  }

  async function end() {
    live.current = false;
    clearTimeout(timer.current);
    stopSpeaking();
    setPhase("ending");
    const current = listener.current;
    listener.current = null;
    await current?.stop().catch(() => {});

    const transcript = lines.current.map(formatLine);
    let summary: VisitSummary | null = null;
    if (transcript.length > 0) {
      try {
        const response = await fetch("/api/room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "summary",
            transcript: transcript.slice(-2000).map((line) => line.slice(0, 2000)),
            flagged: flagged.current.slice(-50).map((line) => line.slice(0, 2000)),
            profile: getProfile(),
          }),
        });
        if (response.ok) summary = await response.json();
      } catch {
        // The transcript is still saved below.
      }
    }

    onFinish(saveVisit({ startedAt: startedAt.current, summary, transcript }));
  }

  if (phase === "intro") {
    return (
      <Intro
        profile={profile}
        supported={supported}
        consent={consent}
        autoAnswer={autoAnswer}
        onConsent={setConsent}
        onAutoAnswer={setAutoAnswer}
        onEditProfile={onEditProfile}
        onStart={start}
      />
    );
  }

  const helper = helperFor(profile);
  const shared = sharedDetails(profile);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {phase === "ending" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background px-6 text-center">
          <VoiceOrb state="thinking" />
          <p className="mt-6 text-lg font-medium">Organizing your visit summary…</p>
          <p className="mt-1 text-sm text-muted-foreground">Questions, instructions and follow-ups, in plain words.</p>
        </div>
      )}

      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-stone-200/70 px-4 py-3 sm:px-6">
        <Logo className="hidden h-[18px] sm:block" />
        <div className="flex items-center gap-3 sm:border-l sm:border-stone-200 sm:pl-4">
          <VoiceOrb state={speaking ? "speaking" : listeningState === "listening" ? "listening" : "idle"} size="sm" />
          <div className="leading-tight">
            <p className="text-sm font-medium">{speaking ? "Barry is speaking" : listeningState === "starting" ? "Starting microphone…" : listeningState === "failed" ? "Listening stopped" : "Listening"}</p>
            <p className="text-xs text-muted-foreground">
              Appointment · <Elapsed />
            </p>
          </div>
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2.5 text-sm">
          <span className="hidden sm:inline">Answer simple questions out loud</span>
          <span className="sm:hidden">Answer out loud</span>
          <Switch checked={autoAnswer} onChange={setAutoAnswer} label="Answer simple questions out loud" />
        </label>
        <Button onClick={end} disabled={phase === "ending"} className="h-10 rounded-full px-4">
          End appointment
        </Button>
      </header>

      {listeningState === "failed" && phase === "live" && (
        <div className="flex items-center justify-between gap-3 bg-red-50 px-4 py-3 text-sm text-red-700 sm:px-6">
          <span>Barry is not picking up this appointment.</span>
          <Button variant="outline" onClick={listen}>Retry listening</Button>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-3 bg-red-50 px-4 py-2 text-sm text-red-700 sm:px-6">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="font-medium underline-offset-2 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 sm:px-6">
            <p aria-live="polite" className="min-h-14 text-lg leading-relaxed text-stone-500">
              {partial || lastHeard || (listeningState === "failed" ? "Retry listening to continue capturing the appointment." : listeningState === "starting" ? "Starting microphone…" : "Listening for the doctor…")}
            </p>

            {cards.length === 0 && (
              <div className="rounded-2xl border border-dashed border-stone-200 px-6 py-10 text-center">
                <p className="font-medium">When the doctor asks you something, it shows up here.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Simple questions get answered, hard ones get easier, and the big ones stay yours.
                </p>
              </div>
            )}

            {cards.map((card, index) => (
              <QuestionCard
                key={card.id}
                card={card}
                current={index === 0}
                autoAnswer={autoAnswer}
                helper={helper}
                onSay={say}
                onChoose={(option) => choose(card, option)}
                onRepeat={() => {
                  flagUnclear();
                  void say("Could you please say that again, more simply?");
                }}
              />
            ))}
          </div>
        </main>

        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-stone-200/70 bg-stone-50 px-5 py-6 lg:block">
          <h2 className="text-sm font-medium">Shared with your care team</h2>
          <p className="mt-1 text-xs text-muted-foreground">Barry only says what you&apos;ve allowed.</p>
          {shared.length > 0 ? (
            <dl className="mt-4 flex flex-col gap-4">
              {shared.map((section) => (
                <div key={section.title}>
                  <dt className="text-xs font-medium text-stone-500">{section.title}</dt>
                  {section.items.map((item) => (
                    <dd key={item} className="mt-1 text-sm">
                      {item}
                    </dd>
                  ))}
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Nothing yet. Add details in What Barry Knows.</p>
          )}
        </aside>
      </div>

      <footer className="border-t border-stone-200/70 px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                flagUnclear();
                void say("I didn't understand that. Could you explain it in a simpler way?");
              }}
              className="flex h-11 items-center gap-2 rounded-full bg-orange-500 px-4 text-[15px] font-medium text-white transition-colors hover:bg-orange-600"
            >
              I didn&apos;t understand
              {flaggedCount > 0 && (
                <span className="rounded-full bg-white/25 px-1.5 text-xs tabular-nums">{flaggedCount}</span>
              )}
            </button>
            {PHRASES.map((phrase) => (
              <PhraseButton
                key={phrase.text}
                onClick={() => {
                  if (phrase.unclear) flagUnclear();
                  void say(phrase.text);
                }}
              >
                {phrase.text.replace(/\.$/, "")}
              </PhraseButton>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.trim()) return;
              void say(draft.trim());
              setDraft("");
            }}
            className="flex gap-2"
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type something for Barry to say"
              aria-label="Type something for Barry to say"
              className="h-12 min-w-0 flex-1 rounded-xl border border-stone-200 px-4 text-base outline-none placeholder:text-muted-foreground focus:border-stone-400"
            />
            <Button
              type="submit"
              disabled={!draft.trim()}
              className="h-12 rounded-xl bg-orange-500 px-5 text-base text-white hover:bg-orange-600 disabled:bg-stone-100 disabled:text-stone-400 disabled:opacity-100"
            >
              <Volume2 className="size-5" />
              Say it
            </Button>
          </form>
        </div>
      </footer>
    </div>
  );
}

function QuestionCard({
  card,
  current,
  autoAnswer,
  helper,
  onSay,
  onChoose,
  onRepeat,
}: {
  card: Card;
  current: boolean;
  autoAnswer: boolean;
  helper: ReturnType<typeof helperFor>;
  onSay: (text: string, who?: "barry" | "me") => void;
  onChoose: (option: Card["options"][number]) => void;
  onRepeat: () => void;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border p-5 transition-opacity sm:p-6",
        current ? "border-stone-300 shadow-[0_1px_3px_rgb(0_0_0/0.05)]" : "border-stone-200 opacity-70 hover:opacity-100",
      )}
    >
      <p className="flex items-center gap-2 text-sm font-medium text-stone-500">
        {current && <span aria-hidden className="size-2 rounded-full bg-orange-500" />}
        {LABELS[card.route]}
      </p>
      <h3 className="mt-2 text-2xl leading-snug font-semibold text-balance">{card.simple}</h3>
      {card.question && card.question !== card.simple && (
        <p className="mt-1 text-sm text-muted-foreground">Doctor asked: “{card.question}”</p>
      )}

      {card.route === "answer" && card.answer && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-orange-50 py-3 pr-2 pl-4">
          <p className="flex-1 text-lg text-stone-900">{card.answer}</p>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => onSay(card.answer!, "barry")}
            className="rounded-lg text-orange-700 hover:bg-orange-100 hover:text-orange-800"
          >
            <Volume2 />
            {autoAnswer ? "Say again" : "Say it"}
          </Button>
        </div>
      )}

      {card.route === "ask" && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {card.options.map((option) => (
            <button
              key={option.label}
              onClick={() => onChoose(option)}
              aria-pressed={card.chosen === option.label}
              className={cn(
                "min-h-14 rounded-xl border px-4 text-lg font-medium transition-colors",
                card.chosen === option.label
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-stone-200 hover:border-orange-300 hover:bg-orange-50/60",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {card.route === "patient" && (
        <>
          <p className="mt-3 text-muted-foreground">Take your time. Answer in your own words.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <PhraseButton onClick={onRepeat}>Ask them to repeat</PhraseButton>
            <PhraseButton onClick={() => onSay("I need a moment to think about that.")}>I need a moment</PhraseButton>
            <PhraseButton
              onClick={() =>
                onSay(
                  helper ? `I'd like to check with ${helper.spoken} first.` : "I'd like to check with someone I trust first.",
                )
              }
            >
              {helper ? `Check with ${helper.label}` : "Check with my helper"}
            </PhraseButton>
          </div>
        </>
      )}
    </article>
  );
}

function Intro({
  profile,
  supported,
  consent,
  autoAnswer,
  onConsent,
  onAutoAnswer,
  onEditProfile,
  onStart,
}: {
  profile: Profile;
  supported: boolean;
  consent: boolean;
  autoAnswer: boolean;
  onConsent: (value: boolean) => void;
  onAutoAnswer: (value: boolean) => void;
  onEditProfile: () => void;
  onStart: () => void;
}) {
  const shared = sharedDetails(profile);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-xl px-6 pt-10 pb-16 sm:pt-16">
        <VoiceOrb state="idle" />
        <h1 className="mt-6 text-[32px] leading-tight font-semibold tracking-tight">In the room</h1>
        <p className="mt-2 text-lg text-pretty text-muted-foreground">
          Barry comes into your appointment with you. He listens, helps you follow along, and speaks up when you
          want him to. You stay in charge of every answer.
        </p>

        <dl className="mt-8 divide-y divide-stone-200/70 border-y border-stone-200/70">
          {[
            ["Answers simple things", "Facts like your allergies or medicines, said out loud for you."],
            ["Makes hard questions easier", "Long or confusing questions become plain words and a few big buttons."],
            ["Leaves the big things to you", "Decisions, consent, pain and feelings are always yours to answer."],
            ["Writes it all down", "Afterwards you get your instructions, follow-ups and anything that was unclear."],
          ].map(([title, text]) => (
            <div key={title} className="py-4">
              <dt className="font-medium">{title}</dt>
              <dd className="mt-0.5 text-muted-foreground">{text}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 rounded-xl bg-stone-100 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium">Barry may share</p>
            <button onClick={onEditProfile} className="text-sm font-medium underline-offset-2 hover:underline">
              {shared.length > 0 ? "Change" : "Add details"}
            </button>
          </div>
          {shared.length > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">{shared.map((s) => s.title).join(", ")}</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Nothing yet. Add your medications, allergies and how you communicate so Barry can speak up for you.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => onConsent(event.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-orange-500"
            />
            <span>Everyone in the room is OK with Barry listening.</span>
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>Let Barry answer simple questions out loud</span>
            <Switch checked={autoAnswer} onChange={onAutoAnswer} label="Let Barry answer simple questions out loud" />
          </label>
        </div>

        <Button
          onClick={onStart}
          disabled={!consent || !supported}
          className="mt-8 h-14 w-full rounded-2xl bg-orange-500 text-base text-white hover:bg-orange-600 disabled:bg-stone-200 disabled:text-stone-500 disabled:opacity-100"
        >
          <AudioLines className="size-5" />
          Start appointment
        </Button>
        {!supported && (
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Listening isn&apos;t available in this browser. Try Chrome, Edge or Safari.
          </p>
        )}
      </div>
    </div>
  );
}

// The orange voice mark, the same identity as the voice button in the message bar.
export function VoiceOrb({
  state,
  size = "lg",
}: {
  state: "idle" | "listening" | "speaking" | "thinking";
  size?: "sm" | "lg";
}) {
  return (
    <span className={cn("relative grid shrink-0 place-items-center", size === "sm" ? "size-9" : "size-14")}>
      {(state === "listening" || state === "speaking") && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 animate-ping rounded-full bg-orange-500/25 motion-reduce:hidden",
            state === "listening" ? "[animation-duration:2s]" : "[animation-duration:1.1s]",
          )}
        />
      )}
      <span
        className={cn(
          "relative grid size-full place-items-center rounded-full bg-orange-500 text-white",
          state === "thinking" && "animate-pulse",
        )}
      >
        <AudioLines className={size === "sm" ? "size-4" : "size-6"} />
      </span>
    </span>
  );
}

function PhraseButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-11 rounded-full border border-stone-200 px-4 text-[15px] transition-colors hover:border-stone-400 hover:bg-stone-50"
    >
      {children}
    </button>
  );
}

function Elapsed() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="tabular-nums">
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
    </span>
  );
}
