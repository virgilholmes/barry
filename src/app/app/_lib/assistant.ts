import type { Message } from "./chat-store";
import type { Profile } from "@/lib/profile";
import type { ModelId } from "./models";

// Streams Barry's reply from /api/chat (Amazon Bedrock) as plain text chunks.
export async function* streamReply({
  messages,
  profile,
  model,
  signal,
}: {
  messages: Message[];
  profile: Profile;
  model: ModelId;
  signal: AbortSignal;
}): AsyncGenerator<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      profile,
      messages: messages
        .filter((message) => message.content.trim())
        .map(({ role, content }) => ({ role, content })),
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    const data: { error?: string } | null = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Please try again in a moment.");
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}
