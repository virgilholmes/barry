import { EventStreamCodec } from "@smithy/eventstream-codec";
import { fromUtf8, toUtf8 } from "@smithy/util-utf8";
import { getRecognition } from "./speech";

export type ListenHandlers = {
  /** The segment currently being spoken, updated as words come in. */
  onPartial: (text: string) => void;
  /** A finished segment (roughly a sentence). */
  onFinal: (text: string) => void;
  onError: (message: string) => void;
};

export type Listener = {
  /** Stop listening and wait for any last words to arrive. */
  stop: () => Promise<void>;
  /** Stop immediately. */
  abort: () => void;
};

type Purpose = "room" | "dictation";

const MIC_DENIED = "Barry needs access to your microphone to listen.";

async function transcribeEnabled() {
  // Recheck each session so a temporary failure or newly configured credentials
  // do not disable Transcribe for the lifetime of the page.
  return fetch("/api/transcribe", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : { enabled: false }))
    .then((data: { enabled?: boolean }) => Boolean(data.enabled))
    .catch(() => false);
}

function canStream() {
  return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && "AudioWorkletNode" in window;
}

export function listeningSupported() {
  return canStream() || !!getRecognition();
}

export async function startListening(purpose: Purpose, handlers: ListenHandlers): Promise<Listener> {
  if (canStream() && (await transcribeEnabled())) return startTranscribe(purpose, handlers);
  if (getRecognition()) return startBrowserRecognition(handlers);
  throw new Error("Listening isn't available in this browser. Try Chrome, Edge or Safari.");
}

// Browser speech recognition. Restarts itself, since browsers end continuous
// recognition after a stretch of silence.
function startBrowserRecognition(handlers: ListenHandlers): Listener {
  const Recognition = getRecognition()!;
  let active = true;
  let current: InstanceType<typeof Recognition> | null = null;
  let finished: (() => void) | null = null;

  function run() {
    const r = new Recognition();
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language;
    let emitted = 0;
    r.onresult = (event) => {
      let partial = "";
      for (let i = emitted; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript.trim();
        if (result.isFinal) {
          if (i === emitted) {
            emitted++;
            if (text) handlers.onFinal(text);
          }
        } else {
          partial += `${text} `;
        }
      }
      handlers.onPartial(partial.trim());
    };
    r.onerror = (event) => {
      if (!active || event.error === "no-speech") return;
      active = false;
      const message = event.error === "not-allowed" || event.error === "service-not-allowed"
        ? MIC_DENIED
        : event.error === "network"
          ? "Speech recognition couldn't connect. Check your connection, then retry listening."
          : event.error === "audio-capture"
            ? "No microphone audio is available. Check your microphone, then retry listening."
            : "Speech recognition stopped. Please retry listening.";
      handlers.onError(message);
      r.abort();
    };
    r.onend = () => {
      current = null;
      if (active) run();
      else finished?.();
    };
    current = r;
    r.start();
  }

  run();

  return {
    stop: () =>
      new Promise<void>((resolve) => {
        active = false;
        if (!current) return resolve();
        finished = resolve;
        current.stop();
      }),
    abort: () => {
      active = false;
      current?.abort();
    },
  };
}

// Amazon Transcribe streaming over a presigned WebSocket. Audio is captured,
// downsampled to 16 kHz 16-bit PCM in an AudioWorklet, and sent as event-stream
// messages.
const WORKLET = `
class BarryPcm16k extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / 16000;
    this.acc = 0; this.sum = 0; this.count = 0;
    this.out = new Int16Array(1600); this.length = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    for (let i = 0; i < channel.length; i++) {
      this.sum += channel[i]; this.count++; this.acc++;
      if (this.acc >= this.step) {
        this.acc -= this.step;
        const s = Math.max(-1, Math.min(1, this.sum / this.count));
        this.sum = 0; this.count = 0;
        this.out[this.length++] = s < 0 ? s * 0x8000 : s * 0x7fff;
        if (this.length === this.out.length) {
          this.port.postMessage(this.out.buffer, [this.out.buffer]);
          this.out = new Int16Array(1600); this.length = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor("barry-pcm16k", BarryPcm16k);
`;

const codec = new EventStreamCodec(toUtf8, fromUtf8);

function audioEvent(pcm: Uint8Array) {
  return codec.encode({
    headers: {
      ":message-type": { type: "string", value: "event" },
      ":event-type": { type: "string", value: "AudioEvent" },
      ":content-type": { type: "string", value: "application/octet-stream" },
    },
    body: pcm,
  });
}

type TranscriptEvent = {
  Transcript?: { Results?: { IsPartial: boolean; Alternatives?: { Transcript?: string }[] }[] };
  Message?: string;
};

async function startTranscribe(purpose: Purpose, handlers: ListenHandlers): Promise<Listener> {
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: navigator.language, purpose }),
  });
  const data: { url?: string; error?: string } = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) throw new Error(data.error ?? "Couldn't start Amazon Transcribe.");

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch {
    throw new Error(MIC_DENIED);
  }

  const context = new AudioContext();
  const moduleUrl = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
  try {
    await context.resume();
    await context.audioWorklet.addModule(moduleUrl);
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    await context.close();
    throw error;
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }

  const source = context.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(context, "barry-pcm16k");
  const mute = context.createGain();
  mute.gain.value = 0;
  source.connect(worklet).connect(mute).connect(context.destination);

  const socket = new WebSocket(data.url);
  socket.binaryType = "arraybuffer";
  const backlog: Uint8Array[] = [];
  let closed = false;
  let stopping = false;
  let onClosed: (() => void) | null = null;

  function cleanup() {
    if (closed) return;
    closed = true;
    worklet.port.onmessage = null;
    stream.getTracks().forEach((track) => track.stop());
    void context.close();
    onClosed?.();
  }

  worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
    const frame = audioEvent(new Uint8Array(event.data));
    if (socket.readyState === WebSocket.OPEN) socket.send(frame);
    else if (socket.readyState === WebSocket.CONNECTING) backlog.push(frame);
  };

  socket.onopen = () => {
    backlog.splice(0).forEach((frame) => socket.send(frame));
  };

  socket.onmessage = (event: MessageEvent<ArrayBuffer>) => {
    const message = codec.decode(new Uint8Array(event.data));
    const payload: TranscriptEvent = JSON.parse(toUtf8(message.body) || "{}");
    if (message.headers[":message-type"]?.value !== "event") {
      handlers.onError(payload.Message ?? "Amazon Transcribe stopped listening.");
      return;
    }
    for (const result of payload.Transcript?.Results ?? []) {
      const text = result.Alternatives?.[0]?.Transcript?.trim() ?? "";
      if (result.IsPartial) handlers.onPartial(text);
      else if (text) {
        handlers.onFinal(text);
        handlers.onPartial("");
      }
    }
  };

  socket.onerror = () => handlers.onError("Couldn't connect to Amazon Transcribe.");
  socket.onclose = () => {
    if (!stopping && !closed) handlers.onError("Listening disconnected. Please retry listening.");
    cleanup();
  };

  return {
    stop: () =>
      new Promise<void>((resolve) => {
        if (closed) return resolve();
        stopping = true;
        onClosed = resolve;
        worklet.port.onmessage = null;
        // An empty audio event tells Transcribe the audio is done; it then sends
        // the last results and closes the connection.
        if (socket.readyState === WebSocket.OPEN) socket.send(audioEvent(new Uint8Array(0)));
        setTimeout(() => {
          socket.close();
          cleanup();
        }, 2000);
      }),
    abort: () => {
      stopping = true;
      socket.close();
      cleanup();
    },
  };
}
