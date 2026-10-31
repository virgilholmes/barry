import { useEffect, useRef, useState } from "react";
import { getRecognition, useSpeechSupported, type Recognition } from "./speech";

export function useDictation(onText: (text: string) => void) {
  const supported = useSpeechSupported();
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
