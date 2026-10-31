import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type RecognitionResultList = ArrayLike<ArrayLike<{ transcript: string }>>;

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { results: RecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type RecognitionConstructor = new () => Recognition;

function getRecognition(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const subscribe = () => () => {};

export function useDictation(onText: (text: string) => void) {
  const supported = useSyncExternalStore(subscribe, () => !!getRecognition(), () => false);
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);

  useEffect(() => () => recognition.current?.abort(), []);

  function start(base: string) {
    const Recognition = getRecognition();
    if (!Recognition) return;

    const r = new Recognition();
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language;
    r.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      const prefix = base.trim() ? `${base.trimEnd()} ` : "";
      onText(prefix + transcript.trimStart());
    };
    r.onend = r.onerror = () => {
      recognition.current = null;
      setListening(false);
    };

    recognition.current = r;
    r.start();
    setListening(true);
  }

  function stop() {
    recognition.current?.stop();
  }

  return { supported, listening, start, stop };
}
