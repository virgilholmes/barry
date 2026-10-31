import { useEffect, useRef, useState } from "react";
import { getRecognition, useSpeechSupported, type Recognition } from "./speech";

export type VoiceStatus = "idle" | "listening" | "thinking" | "speaking";

// A hands-free loop: listen for one utterance, hand it off, speak the reply, listen again.
export function useVoiceSession(onUtterance: (text: string) => Promise<string>) {
  const supported = useSpeechSupported();
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const active = useRef(false);
  const recognition = useRef<Recognition | null>(null);
  const handler = useRef(onUtterance);

  useEffect(() => {
    handler.current = onUtterance;
  });

  useEffect(() => () => end(), []);

  function listen() {
    const Recognition = getRecognition();
    if (!Recognition || !active.current) return;

    const r = new Recognition();
    r.continuous = false;
    r.interimResults = true;
    r.lang = navigator.language;

    let heard = "";
    r.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      heard = text.trim();
      setCaption(heard);
    };
    r.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Barry needs access to your microphone to listen.");
        end();
      }
    };
    r.onend = () => {
      recognition.current = null;
      if (!active.current) return;
      if (heard) respond(heard);
      else listen();
    };

    recognition.current = r;
    setStatus("listening");
    setCaption("");
    r.start();
  }

  async function respond(text: string) {
    setStatus("thinking");
    const reply = await handler.current(text);
    if (active.current) speak(reply);
  }

  function speak(text: string) {
    if (!text || !("speechSynthesis" in window)) return listen();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = navigator.language;
    utterance.onend = utterance.onerror = () => {
      if (active.current) listen();
    };
    setStatus("speaking");
    setCaption(text);
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  function start() {
    if (active.current) return;
    active.current = true;
    setError(null);
    listen();
  }

  function end() {
    active.current = false;
    recognition.current?.abort();
    recognition.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
    setStatus("idle");
    setCaption("");
  }

  // Tapping while listening means "I'm done talking"; while speaking, it interrupts Barry.
  function tap() {
    if (status === "listening") recognition.current?.stop();
    else if (status === "speaking") speechSynthesis.cancel();
  }

  return { supported, status, caption, error, start, end, tap, clearError: () => setError(null) };
}
