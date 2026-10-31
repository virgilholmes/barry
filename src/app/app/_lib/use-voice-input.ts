import { useEffect, useRef, useState } from "react";
import { startListening, type Listener } from "./listen";
import { stopSpeaking } from "./speak";

/**
 * Tap-to-talk for a single answer. Uses Amazon Transcribe when it's set up
 * (falling back to the browser's speech recognition), shows words as they're
 * heard, and stops by itself after a short pause.
 */
export function useVoiceInput({
  onText,
  onDone,
}: {
  onText: (text: string) => void;
  onDone?: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listener = useRef<Listener | null>(null);
  const finals = useRef<string[]>([]);
  const pause = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cancelled = useRef(false);
  const callbacks = useRef({ onText, onDone });

  useEffect(() => {
    callbacks.current = { onText, onDone };
  });

  useEffect(
    () => () => {
      clearTimeout(pause.current);
      listener.current?.abort();
    },
    [],
  );

  async function start() {
    stopSpeaking();
    setError(null);
    finals.current = [];
    cancelled.current = false;
    setListening(true);
    try {
      const started = await startListening("dictation", {
        onPartial: (partial) => {
          if (!partial) return;
          clearTimeout(pause.current);
          callbacks.current.onText([...finals.current, partial].join(" ").trim());
        },
        onFinal: (text) => {
          finals.current.push(text);
          callbacks.current.onText(finals.current.join(" "));
          clearTimeout(pause.current);
          pause.current = setTimeout(stop, 2000);
        },
        onError: (message) => {
          setError(message);
          void stop();
        },
      });
      listener.current = started;
      if (cancelled.current) await stop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Barry couldn't start listening.");
      setListening(false);
    }
  }

  async function stop() {
    clearTimeout(pause.current);
    const current = listener.current;
    listener.current = null;
    if (!current) {
      cancelled.current = true;
      return;
    }
    await current.stop().catch(() => {});
    setListening(false);
    const text = finals.current.join(" ").trim();
    if (text) callbacks.current.onDone?.(text);
  }

  return { listening, error, start, stop, toggle: () => (listening ? stop() : start()) };
}
