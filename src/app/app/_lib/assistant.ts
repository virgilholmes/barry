import type { Message } from "./chat-store";

// Placeholder until Barry is connected to a model. Swap this generator for a
// real streaming call; the UI only depends on it yielding text chunks.
const PLACEHOLDER_REPLY =
  "I'm not connected to a model yet, so I can't give you a real answer. Once I'm live, I'll help you get ready for appointments, keep your health details in one place, and make sure your voice is heard in the room.";

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export async function* streamReply({
  signal,
}: {
  messages: Message[];
  signal: AbortSignal;
}): AsyncGenerator<string> {
  await wait(600, signal);
  for (const word of PLACEHOLDER_REPLY.split(/(?<=\s)/)) {
    if (signal.aborted) return;
    yield word;
    await wait(20 + Math.random() * 40, signal);
  }
}
