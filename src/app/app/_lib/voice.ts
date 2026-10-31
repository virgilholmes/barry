import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Default recognizers stream audio to the cloud, so Barry only listens with on-device recognition (processLocally).
// ponytail: English only, to match the rules in route.ts.
const LANG = "en-US";

type Availability = "unavailable" | "downloadable" | "downloading" | "available";
type VoiceStatus = "checking" | Availability;

type Options = { langs: string[]; processLocally: boolean };
type ResultList = ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { resultIndex: number; results: ResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type RecognitionClass = {
  new (): Recognition;
  prototype: object;
  available: (options: Options) => Promise<Availability>;
  install: (options: Options) => Promise<boolean>;
};

const OPTIONS: Options = { langs: [LANG], processLocally: true };

function localRecognition() {
  const w = window as unknown as { SpeechRecognition?: RecognitionClass; webkitSpeechRecognition?: RecognitionClass };
  return [w.SpeechRecognition, w.webkitSpeechRecognition].find(
    (R) => R && typeof R.available === "function" && typeof R.install === "function" && "processLocally" in R.prototype,
  );
}

async function check(): Promise<Availability> {
  const R = localRecognition();
  if (!R) return "unavailable";
  return R.available(OPTIONS).catch(() => "unavailable" as const);
}

export function useVoice() {
  const [status, setStatus] = useState<VoiceStatus>("checking");

  useEffect(() => {
    let live = true;
    check().then((next) => {
      if (live) setStatus(next);
    });
    return () => {
      live = false;
    };
  }, []);

  // Downloads the on-device model. Browsers require this to come from a click.
  async function install() {
    const R = localRecognition();
    if (!R || status === "downloading") return;
    setStatus("downloading");
    const ok = await R.install(OPTIONS).catch(() => false);
    setStatus(ok ? "available" : await check());
  }

  return { status, install };
}

// Whether Barry is talking, shared by every component that speaks or listens.
let talking = false;
let quietSince = 0;
const talkListeners = new Set<() => void>();

function setTalking(next: boolean) {
  if (talking && !next) quietSince = Date.now();
  talking = next;
  talkListeners.forEach((listener) => listener());
}

function subscribeTalking(listener: () => void) {
  talkListeners.add(listener);
  return () => {
    talkListeners.delete(listener);
  };
}

export function useTalking() {
  return useSyncExternalStore(subscribeTalking, () => talking, () => false);
}

// The mic can hear Barry, and its final result lands just after he stops.
const ECHO_MS = 1500;
const hearingBarry = () => talking || Date.now() - quietSince < ECHO_MS;

const QUIET_ERRORS = new Set(["no-speech", "aborted"]);
const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. Allow it in your browser settings, or type instead.",
  "audio-capture": "Barry can't find a microphone. You can type instead.",
  "service-not-allowed": "This browser can't turn speech into text on your device right now. You can type instead.",
  "language-not-supported": "Listening on this device isn't ready for English yet. You can type instead.",
};
const FALLBACK_ERROR = "Barry stopped listening. Try again, or type instead.";

// Calls onFinal with each finished phrase; `heard` shows the phrase still being spoken.
export function useSpeech(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [error, setError] = useState<string | null>(null);
  const active = useRef<Recognition | null>(null);
  const keepGoing = useRef(false);
  const handler = useRef(onFinal);

  useEffect(() => {
    handler.current = onFinal;
  });

  useEffect(
    () => () => {
      keepGoing.current = false;
      active.current?.abort();
    },
    [],
  );

  function start() {
    const R = localRecognition();
    if (!R || active.current) return;

    const r = new R();
    r.lang = LANG;
    r.continuous = true;
    r.interimResults = true;
    r.processLocally = true;
    let echo = false;
    r.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        // Drop the whole phrase if any of it overlapped Barry speaking, or a screen reader reading a new card.
        if (hearingBarry() || /^\s*new question\b/i.test(text)) echo = true;
        if (!result.isFinal) {
          if (!echo) setHeard(text);
          continue;
        }
        setHeard("");
        if (!echo && text.trim()) handler.current(text);
        echo = false;
      }
    };
    r.onerror = (event) => {
      if (QUIET_ERRORS.has(event.error)) return;
      keepGoing.current = false;
      setError(ERRORS[event.error] ?? FALLBACK_ERROR);
    };
    let began = Date.now();
    r.onend = () => {
      // Recognizers stop by themselves after a pause, so restart until asked to stop. Restarting
      // only after a session that lasted a second keeps an endlessly aborting recognizer from spinning.
      if (keepGoing.current && Date.now() - began > 1000) {
        try {
          began = Date.now();
          r.start();
          return;
        } catch {}
      }
      keepGoing.current = false;
      active.current = null;
      setHeard("");
      setListening(false);
    };

    keepGoing.current = true;
    active.current = r;
    setError(null);
    try {
      r.start();
      setListening(true);
    } catch {
      keepGoing.current = false;
      active.current = null;
      setError(FALLBACK_ERROR);
    }
  }

  function stop() {
    keepGoing.current = false;
    setHeard("");
    active.current?.stop();
  }

  return { listening, heard, error, start, stop };
}

// Only voices built into the device are used, so nothing Barry says out loud is
// sent to a cloud voice service. With no local voice, Barry shows text instead.
function localVoice() {
  if (typeof speechSynthesis === "undefined") return undefined;
  const voices = speechSynthesis.getVoices().filter((v) => v.localService && v.lang.toLowerCase().startsWith("en"));
  return voices.find((v) => v.default) ?? voices[0];
}

function subscribeVoices(onChange: () => void) {
  if (typeof speechSynthesis === "undefined") return () => {};
  speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => speechSynthesis.removeEventListener("voiceschanged", onChange);
}

export function useCanSpeak() {
  return useSyncExternalStore(subscribeVoices, () => localVoice() !== undefined, () => false);
}

let current: SpeechSynthesisUtterance | null = null;

export function speak(text: string) {
  const voice = localVoice();
  if (!voice) return false;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.9;
  utterance.onstart = () => setTalking(true);
  // cancel() fires onerror ("interrupted") on the old utterance, so only the newest one may clear the flag.
  utterance.onend = utterance.onerror = () => {
    if (current === utterance) setTalking(false);
  };
  current = utterance;
  setTalking(true);
  speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (typeof speechSynthesis === "undefined") return;
  current = null;
  speechSynthesis.cancel();
  if (talking) setTalking(false);
}
