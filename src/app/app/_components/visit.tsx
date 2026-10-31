"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Mic, Pause, Square } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { introduction } from "../_lib/profile";
import { classify, clean, isQuestion, type Classified, type ReplyKind } from "../_lib/route";
import type { Profile } from "../_lib/vault";
import { speak, stopSpeaking, useCanSpeak, useSpeech, useTalking, useVoice } from "../_lib/voice";
import { Dialog, RouteLabel, TopBar, button, field, phi } from "./ui";

type Item = Classified & { id: string; question: string; outcome: string | null; said: boolean };
type Settle = (id: string, outcome: string, spoken?: string) => void;

const CONSENT =
  "Hi, I'm Barry, a visit assistant. Is it okay if I listen to this appointment? I turn speech into text on this device only. No sound is recorded, and my notes are deleted when the visit ends.";

const PHRASES = [
  { label: "Slower, please", say: "Could you slow down, please?" },
  { label: "Say that again", say: "Could you say that again, please?" },
  { label: "Simpler words", say: "Could you say that in simpler words?" },
  { label: "I need a break", say: "I need a short break, please." },
];

const EXAMPLES = ["Any allergies?", "How bad is your pain from 0 to 10?", "Would you like to try a new medicine?"];

// Pain-style scales run from none to worst; any other 0-10 question gets neutral ends.
const PAIN = /\b(pain|hurts?|ache|aching|sore|bad|worse)\b/i;

export function Visit({
  profile,
  onActivity,
  onStart,
  onExit,
}: {
  profile: Profile;
  onActivity: () => void;
  onStart: () => void;
  onExit: (started: boolean) => void;
}) {
  const voice = useVoice();
  const canSpeak = useCanSpeak();
  const talking = useTalking();
  const [phase, setPhase] = useState<"consent" | "live" | "done">("consent");
  const [showInstead, setShowInstead] = useState(false);
  const [listened, setListened] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [lastSettled, setLastSettled] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null);

  const speech = useSpeech((text) => {
    // A phrase can finish after End visit; only questions during the visit count.
    if (phase !== "live" || !isQuestion(text)) return;
    onActivity();
    add(text);
  });

  useEffect(() => stopSpeaking, []);

  // Each phase starts at its heading for keyboard and screen reader users.
  useEffect(() => {
    if (phase !== "consent") document.querySelector<HTMLElement>("main h1")?.focus();
  }, [phase]);

  const speaks = canSpeak && !showInstead;
  const sayLabel = speaks ? "Say it" : "Show doctor";

  function say(text: string) {
    if (!speaks || !speak(text)) setShown(text);
  }

  function add(text: string) {
    const question = clean(text);
    if (!question) return;
    setItems((list) => [
      ...list,
      { id: crypto.randomUUID(), question, outcome: null, said: false, ...classify(question, profile) },
    ]);
  }

  const settle: Settle = (id, outcome, spoken) => {
    if (spoken) say(spoken);
    setLastSettled(id);
    setItems((list) => list.map((item) => (item.id === id ? { ...item, outcome, said: !!spoken } : item)));
  };

  function reopen(item: Item) {
    if (item.said) say("Sorry, I pressed the wrong button.");
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, outcome: null, said: false } : i)));
  }

  function begin(withVoice: boolean) {
    onStart();
    setPhase("live");
    if (withVoice) startListening();
  }

  function startListening() {
    setListened(true);
    speech.start();
  }

  function end() {
    speech.stop();
    stopSpeaking();
    setPhase("done");
  }

  if (phase === "consent") {
    return (
      <>
        <TopBar>
          <Logo className="h-6" />
          <button className={cn(button.quiet, "ml-auto")} onClick={() => onExit(false)}>
            Cancel
          </button>
        </TopBar>
        <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8">
          <h1 tabIndex={-1} className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Before Barry listens
          </h1>
          <p className="mt-3 text-lg">Ask your doctor if it&apos;s okay for Barry to listen. Barry can ask for you.</p>
          <blockquote className="mt-6 rounded-2xl bg-muted p-5 text-lg">“{CONSENT}”</blockquote>
          <button className={cn(button.outline, "mt-4")} onClick={() => say(CONSENT)}>
            {speaks ? "Ask for me" : "Show doctor"}
          </button>
          {canSpeak && (
            <label className="mt-6 flex min-h-12 cursor-pointer items-center gap-3 text-lg">
              <input
                type="checkbox"
                checked={showInstead}
                onChange={(event) => setShowInstead(event.target.checked)}
                className="size-6 shrink-0 accent-foreground"
              />
              Show answers on screen instead of saying them
            </label>
          )}

          <div className="mt-10 border-t pt-8">
            {voice.status === "checking" && (
              <p role="status" className="text-lg">
                Checking whether this device can listen privately…
              </p>
            )}
            {voice.status === "available" && (
              <button className={cn(button.primary, "min-h-16 w-full text-lg")} onClick={() => begin(true)}>
                <Mic aria-hidden />
                My doctor said yes. Start listening
              </button>
            )}
            {(voice.status === "downloadable" || voice.status === "downloading") && (
              <>
                <p className="text-lg">
                  Barry needs a one-time download to listen on this device. Sound never leaves this device.
                </p>
                <button
                  className={cn(button.primary, "mt-4 w-full")}
                  onClick={voice.install}
                  aria-busy={voice.status === "downloading"}
                >
                  {voice.status === "downloading" ? "Turning on listening…" : "Turn on listening"}
                </button>
              </>
            )}
            {voice.status === "unavailable" && (
              <p className="text-lg">
                This browser can&apos;t turn speech into text on your device. Barry won&apos;t send your
                doctor&apos;s voice anywhere else, so you can type their questions instead.
              </p>
            )}
            <button
              className={cn(voice.status === "unavailable" ? button.primary : button.outline, "mt-4 w-full")}
              onClick={() => begin(false)}
            >
              Type questions instead
            </button>
          </div>
        </main>
        <ShowDialog text={shown} onClose={() => setShown(null)} />
      </>
    );
  }

  if (phase === "done") {
    return (
      <>
        <TopBar>
          <Logo className="h-6" />
        </TopBar>
        <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8">
          <h1 tabIndex={-1} className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Visit finished
          </h1>
          <p className="mt-3 text-lg">
            Here&apos;s what happened. This summary isn&apos;t saved anywhere. It&apos;s deleted when you finish.
          </p>
          {items.length === 0 ? (
            <p className="mt-8 text-lg text-muted-foreground">No questions were added during this visit.</p>
          ) : (
            <ol className="mt-8 divide-y border-y">
              {items.map((item) => (
                <li key={item.id} className="py-5">
                  <RouteLabel route={item.route} />
                  <p className="mt-2 text-xl font-semibold">“{item.question}”</p>
                  <p className={cn("mt-1 text-lg", !item.outcome && "text-muted-foreground")}>
                    {item.outcome ?? "Not answered"}
                  </p>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-10 flex flex-col gap-6 sm:flex-row">
            <button className={button.outline} onClick={() => setPhase("live")}>
              Back to the visit
            </button>
            <button className={button.primary} onClick={() => onExit(true)}>
              Delete notes and finish
            </button>
          </div>
        </main>
      </>
    );
  }

  // The question being answered stays put; newer ones wait below instead of replacing it.
  const current = items.find((i) => !i.outcome) ?? items.find((i) => i.id === lastSettled) ?? items.at(-1);
  const others = items.filter((i) => i !== current).reverse();
  const newest = items.at(-1);
  const mode = speech.listening ? "Listening" : listened ? "Paused" : "Typing only";

  return (
    <>
      <header id="visit-bar" className="top-0 z-10 border-b bg-background [@media(min-height:40rem)]:sticky">
        <div className="mx-auto flex min-h-16 w-full max-w-2xl flex-wrap items-center gap-2 px-4 py-2">
          <p className="flex items-center gap-2.5 text-lg font-semibold">
            <span
              aria-hidden
              className={cn("size-3.5 rounded-[3px]", speech.listening ? "bg-barry" : "border-2 border-foreground")}
            />
            {mode}
          </p>
          {voice.status === "available" &&
            (speech.listening ? (
              <button className={button.quiet} onClick={speech.stop}>
                <Pause aria-hidden />
                Pause
              </button>
            ) : (
              <button className={button.quiet} onClick={startListening}>
                <Mic aria-hidden />
                {listened ? "Resume" : "Listen"}
              </button>
            ))}
          {talking && (
            <button className={button.quiet} onClick={stopSpeaking}>
              <Square aria-hidden />
              Stop talking
            </button>
          )}
          <button className={cn(button.outline, "ml-auto")} onClick={end}>
            End visit
          </button>
        </div>
        <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-2 px-4 pb-3 sm:grid-cols-4">
          {PHRASES.map((phrase) => (
            <button key={phrase.label} className={cn(button.outline, "px-2")} onClick={() => say(phrase.say)}>
              {phrase.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6">
        <h1 tabIndex={-1} className="sr-only">
          Doctor visit
        </h1>
        <p className="sr-only" aria-live="polite">
          {newest ? `New question: ${newest.question}` : ""}
        </p>
        {speech.error && (
          <p role="alert" className="mb-4 rounded-xl border-[1.5px] border-destructive p-4 font-semibold text-destructive">
            {speech.error}
          </p>
        )}
        {/* A fixed slot, so the answer buttons don't jump while words arrive. */}
        {listened && (
          <p className="mb-4 h-7 truncate text-lg text-muted-foreground">{speech.heard && `Hearing: ${speech.heard}`}</p>
        )}

        {current ? (
          <QuestionCard
            key={current.id}
            item={current}
            sayLabel={sayLabel}
            onSay={say}
            onSettle={settle}
            onReopen={reopen}
          />
        ) : (
          <>
            <Introduction profile={profile} sayLabel={sayLabel} onSay={say} />
            <p className="mt-6 text-lg text-muted-foreground">
              {speech.listening
                ? "When your doctor asks a question, it shows up here."
                : "Type what your doctor asks below, and Barry will help you answer."}
            </p>
          </>
        )}

        <AskForm onAdd={add} />
        {items.length === 0 && (
          <div className="mt-4">
            <p className="text-base text-muted-foreground">Or try an example:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button key={example} className={cn(button.outline, "text-left")} onClick={() => add(example)}>
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {current && (
          <section aria-labelledby="others" className="mt-12">
            <h2 id="others" className="text-xl font-semibold">
              Other questions
            </h2>
            <div className="mt-4 grid gap-3">
              {others.map((item) => (
                <QuestionCard
                  key={item.id}
                  item={item}
                  sayLabel={sayLabel}
                  onSay={say}
                  onSettle={settle}
                  onReopen={reopen}
                  compact
                />
              ))}
              <Introduction profile={profile} sayLabel={sayLabel} onSay={say} compact />
            </div>
          </section>
        )}
      </main>
      <ShowDialog text={shown} onClose={() => setShown(null)} />
    </>
  );
}

function Introduction({
  profile,
  sayLabel,
  onSay,
  compact,
}: {
  profile: Profile;
  sayLabel: string;
  onSay: (text: string) => void;
  compact?: boolean;
}) {
  const text = introduction(profile);
  return (
    <article className={cn("rounded-2xl border-[1.5px] p-5", compact ? "border-border" : "border-foreground")}>
      <h2 className={cn("font-semibold tracking-tight", compact ? "text-lg" : "text-2xl")}>Introduce yourself</h2>
      <p className="mt-2 text-lg text-muted-foreground">Barry tells your doctor how you like to communicate.</p>
      <p className="mt-4 rounded-xl bg-muted p-4 text-lg">{text}</p>
      <button className={cn(button.primary, "mt-4")} onClick={() => onSay(text)}>
        {sayLabel}
      </button>
    </article>
  );
}

function QuestionCard({
  item,
  sayLabel,
  onSay,
  onSettle,
  onReopen,
  compact,
}: {
  item: Item;
  sayLabel: string;
  onSay: (text: string) => void;
  onSettle: Settle;
  onReopen: (item: Item) => void;
  compact?: boolean;
}) {
  const question = useRef<HTMLHeadingElement>(null);
  const outcome = useRef<HTMLParagraphElement>(null);

  // A new question takes focus only if nothing else has it, so typing elsewhere isn't interrupted.
  useEffect(() => {
    if (!compact && (document.activeElement === document.body || !document.activeElement)) question.current?.focus();
  }, [compact]);
  // After answering, focus lands on the answer instead of falling back to the top of the page.
  useEffect(() => {
    if (!compact && item.outcome) outcome.current?.focus();
  }, [compact, item.outcome]);

  return (
    <article className={cn("rounded-2xl border-[1.5px] p-5", compact ? "border-border" : "border-foreground")}>
      <RouteLabel route={item.route} />
      <h2
        ref={question}
        tabIndex={-1}
        className={cn("mt-3 font-semibold tracking-tight", compact ? "text-xl" : "text-2xl sm:text-3xl")}
      >
        “{item.question}”
      </h2>

      {item.outcome ? (
        <>
          <p ref={outcome} tabIndex={-1} className="mt-3 text-lg">
            {item.outcome}
          </p>
          <button className={cn(button.quiet, "mt-2")} onClick={() => onReopen(item)}>
            Change answer
          </button>
        </>
      ) : item.route === "answer" ? (
        <>
          <p className="mt-4 rounded-xl bg-muted p-4 text-lg">{item.answer}</p>
          <div className="mt-4 flex flex-wrap gap-4">
            <button
              className={button.primary}
              onClick={() => onSettle(item.id, `Barry said “${item.answer}”`, item.answer)}
            >
              {sayLabel}
            </button>
            <button className={button.outline} onClick={() => onSettle(item.id, "You chose not to share this.")}>
              Don&apos;t share
            </button>
          </div>
        </>
      ) : item.route === "ask" ? (
        <>
          <Reply
            kind={item.kind}
            question={item.question}
            sayLabel={sayLabel}
            onReply={(text) => onSettle(item.id, `You answered: ${text}`, text)}
          />
          <button
            className={cn(button.outline, "mt-4")}
            onClick={() => onSay("I don't understand the question. Could you ask it a different way?")}
          >
            I don&apos;t understand
          </button>
        </>
      ) : (
        <>
          <p className="mt-3 text-lg">This is your choice, so Barry won&apos;t answer for you. Take as long as you need.</p>
          <div className="mt-4 flex flex-wrap gap-4">
            <button
              className={button.outline}
              onClick={() => onSay("Could you explain that in simpler words, and tell me what my options are?")}
            >
              Explain it more simply
            </button>
            <button
              className={button.outline}
              onClick={() =>
                onSettle(item.id, "You asked for time to think.", "I'd like some time to think about this.")
              }
            >
              I need time to think
            </button>
            <button
              className={button.outline}
              onClick={() =>
                onSettle(
                  item.id,
                  "You asked to talk with your support person first.",
                  "I'd like to talk this over with the person who helps me decide.",
                )
              }
            >
              Ask my support person
            </button>
          </div>
          <div className="mt-6 flex gap-6">
            <button className={cn(button.primary, "min-w-24")} onClick={() => onSettle(item.id, "You decided: Yes", "Yes.")}>
              Yes
            </button>
            <button className={cn(button.primary, "min-w-24")} onClick={() => onSettle(item.id, "You decided: No", "No.")}>
              No
            </button>
          </div>
        </>
      )}
    </article>
  );
}

function Reply({
  kind,
  question,
  sayLabel,
  onReply,
}: {
  kind: ReplyKind;
  question: string;
  sayLabel: string;
  onReply: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const id = useId();

  if (kind === "yesno") {
    return (
      <div className="mt-4 flex flex-wrap gap-4">
        {["Yes", "No", "I'm not sure"].map((answer) => (
          <button key={answer} className={cn(button.primary, "min-w-24")} onClick={() => onReply(answer)}>
            {answer}
          </button>
        ))}
      </div>
    );
  }

  if (kind === "scale") {
    const pain = PAIN.test(question);
    return (
      <div role="group" aria-label="Pick a number from 0 to 10" className="mt-4">
        <p className="mb-3 text-base text-muted-foreground">
          {pain ? "0 is no pain. 10 is the worst." : "0 is the lowest. 10 is the highest."}
        </p>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-11 sm:gap-2">
          {Array.from({ length: 11 }, (_, n) => (
            <button key={n} className={cn(button.outline, "px-0 text-lg")} onClick={() => onReply(`${n} out of 10`)}>
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form
      className="mt-4 flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim()) onReply(text.trim());
      }}
    >
      <label className="sr-only" htmlFor={id}>
        Your answer
      </label>
      <input
        id={id}
        {...phi}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Type your answer"
        maxLength={500}
        className={cn(field, "min-h-12 flex-1")}
      />
      <button type="submit" className={button.primary}>
        {sayLabel}
      </button>
    </form>
  );
}

function AskForm({ onAdd }: { onAdd: (question: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="mt-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (!text.trim()) return;
        onAdd(text);
        setText("");
      }}
    >
      <label htmlFor="ask" className="block text-lg font-medium">
        Type what your doctor asked
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="ask"
          {...phi}
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={500}
          className={cn(field, "min-h-12 flex-1")}
        />
        <button type="submit" className={button.outline}>
          Add question
        </button>
      </div>
    </form>
  );
}

function ShowDialog({ text, onClose }: { text: string | null; onClose: () => void }) {
  return (
    <Dialog open={text !== null} onClose={onClose} label="Show this to your doctor" describedBy="shown-text">
      <p className="text-base font-medium text-muted-foreground">Show this to your doctor</p>
      <p id="shown-text" className="mt-3 text-3xl leading-tight font-semibold tracking-tight">
        {text}
      </p>
      <button className={cn(button.primary, "mt-8 w-full")} onClick={onClose}>
        Done
      </button>
    </Dialog>
  );
}
