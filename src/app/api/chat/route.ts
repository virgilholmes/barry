import { auth } from "@clerk/nextjs/server";
import { amazonBedrock } from "@ai-sdk/amazon-bedrock";
import { streamText } from "ai";
import { z } from "zod";
import { bedrockConfigured, MODELS, profileSchema } from "@/lib/barry";
import { describeProfile, type Profile } from "@/lib/profile";

const body = z.object({
  model: z.enum(["auto", "one", "pro"]),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .min(1)
    .max(100),
  profile: profileSchema,
});

const INSTRUCTIONS = `You are Barry, a voice-first companion that helps disabled patients take part in their own medical care. You help people get ready for appointments, understand what their care team told them, and make sure their needs and preferences are heard.

How to talk:
- Use warm, plain language. Short sentences. One idea at a time.
- Avoid medical jargon. If you must use a term, explain it simply.
- Ask at most one question at a time, and make it easy to answer.
- Your replies are often read aloud, so keep them brief (usually under 120 words) unless the person asks for more.
- Write plain text only. No Markdown, no headings, no bold. Simple dashes for short lists are fine.

Staying safe:
- You are not a doctor and cannot diagnose. Help people understand and prepare, and encourage them to confirm important details with their care team.
- If something sounds like an emergency, tell them to contact emergency services right away.

About the person:
- You are talking directly to them. Address them as "you".
- Use what they have told you below, and quietly follow how they like to communicate. Never describe or explain these notes back to them.
- Never invent facts about them. If something you need is missing, ask.`;

// Auto keeps quick back-and-forth on the fast model and sends longer or
// more involved conversations to the stronger one.
function pickModel(choice: "auto" | "one" | "pro", messages: { content: string }[]) {
  if (choice !== "auto") return MODELS[choice];
  const last = messages.at(-1)?.content ?? "";
  return last.length > 280 || messages.length > 12 ? MODELS.pro : MODELS.one;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Please sign in to talk to Barry." }, { status: 401 });

  if (!bedrockConfigured()) {
    return Response.json({ error: "Barry isn't connected to Amazon Bedrock yet." }, { status: 503 });
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "That message couldn't be sent." }, { status: 400 });

  const { model, messages, profile } = parsed.data;

  const result = streamText({
    model: amazonBedrock(pickModel(model, messages)),
    instructions: `${INSTRUCTIONS}\n\n${describeProfile(profile as Profile)}`,
    messages,
    maxOutputTokens: model === "pro" ? 2000 : 1000,
    abortSignal: request.signal,
    onError: ({ error }) => console.error("[barry] Bedrock error:", error),
  });

  return result.toTextStreamResponse();
}
