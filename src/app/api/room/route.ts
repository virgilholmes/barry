import { auth } from "@clerk/nextjs/server";
import { amazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText, Output } from "ai";
import { z } from "zod";
import { bedrockConfigured, MODELS, profileSchema } from "@/lib/barry";
import { describeProfile, type Profile } from "@/lib/profile";

const line = z.string().max(2000);

const body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("classify"),
    context: z.array(line).max(30),
    latest: line.min(1),
    profile: profileSchema,
  }),
  z.object({
    action: z.literal("summary"),
    transcript: z.array(line).max(2000),
    flagged: z.array(line).max(50),
    profile: profileSchema,
  }),
]);

const card = z.object({
  isQuestion: z
    .boolean()
    .describe("True only if the newest speech asks the patient something or asks them to do something."),
  route: z.enum(["answer", "ask", "patient"]).nullable().describe("Null when isQuestion is false."),
  question: z.string().describe("The clinician's question, cleaned up. Empty when isQuestion is false."),
  simple: z.string().describe("The same question in plain words, 12 words or fewer."),
  answer: z
    .string()
    .nullable()
    .describe('For "answer": one short first-person sentence using only facts from the notes.'),
  options: z
    .array(
      z.object({
        label: z.string().describe("Button text, 1 to 3 words."),
        say: z.string().describe("A full first-person sentence Barry says aloud if the patient picks this."),
      }),
    )
    .describe('For "ask": 2 to 4 choices. Empty otherwise.'),
});

const summary = z.object({
  title: z
    .string()
    .describe('A short name for the visit, 2 to 4 words, like "Heart check-up". Never use the words visit or summary.'),
  overview: z.string().describe("Two or three short, plain sentences on what the visit was about."),
  questions: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .describe("Questions the clinician asked the patient, in plain words, with how they were answered."),
  instructions: z.array(z.string()).describe("Things the patient was told to do, each one short and clear."),
  medicines: z
    .array(z.string())
    .describe("Only medicines that changed: new, stopped, or a different dose or time. Never list unchanged ones."),
  followUps: z
    .array(z.string())
    .describe("Next appointments, tests, referrals, or calls, with timing if it was said."),
  unclear: z
    .array(z.string())
    .describe(
      "Things the patient didn't understand or that were left unclear. Each is one short question they can ask their care team, under 15 words.",
    ),
});

const CLASSIFY = `You support a disabled patient during a live medical appointment. You receive a rough live transcript of the room from speech-to-text. It may contain errors and has no speaker labels: the clinician, the patient, a helper, and Barry (the assistant, reading answers aloud) may all appear.

Decide whether the newest speech asks the patient a question or asks them to do something. Small talk, explanations, and statements are not questions. Lines Barry or the patient said are not questions for the patient.

If it is a question, pick exactly one route:
- "answer": the notes fully and clearly answer it (for example allergies, current medications, conditions, who helps them decide). Write "answer" as what the patient would say, in the first person, one short sentence, using only facts from the notes they agreed to share.
- "ask": the patient can answer by choosing (yes or no, a simple scale, or a few clear options). Give 2 to 4 options. Include "Not sure" when it helps.
- "patient": it needs the patient's own words, a personal decision, consent, or is about pain, feelings, or anything sensitive. Never answer or choose for them.

Always write "simple": the question in plain, everyday words, 12 words or fewer, for someone who struggles with long or complex questions. Follow how they like to communicate.

Never invent facts, and never share anything outside what they agreed to share. If you are not sure the notes fully answer it, use "ask" or "patient". Treatment decisions and consent are always "patient".`;

const SUMMARY = `You organize a visit summary for a disabled patient after a medical appointment, from a rough live transcript (speech-to-text, no speaker labels, may contain errors). Lines starting with "Barry:" were said by the assistant on the patient's behalf. Lines starting with "Me:" were typed or chosen by the patient.

Write in plain, warm, everyday words with short sentences, addressed to the patient as "you". Plain text only, no Markdown. Only include what was actually said. If something was unclear in the transcript, say so rather than guessing. Leave a list empty if there is nothing for it.

"unclear" matters most: include anything the patient asked to be repeated or simplified, said they didn't understand, or anything that was confusing, and turn each into a simple question they can ask their care team.`;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Please sign in to use Barry." }, { status: 401 });
  if (!bedrockConfigured()) {
    return Response.json({ error: "Barry isn't connected to Amazon Bedrock yet." }, { status: 503 });
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "That request wasn't valid." }, { status: 400 });
  const input = parsed.data;
  const notes = describeProfile(input.profile as Profile, { room: true });

  try {
    if (input.action === "summary") {
      const flagged =
        input.flagged.length > 0
          ? `\n\nThe patient asked for help understanding these moments:\n${input.flagged.map((f) => `- ${f}`).join("\n")}`
          : "";
      const { output } = await generateText({
        model: amazonBedrock(MODELS.pro),
        output: Output.object({ schema: summary }),
        instructions: `${SUMMARY}\n\n${notes}`,
        prompt: `Transcript:\n${input.transcript.join("\n") || "(Nothing was captured.)"}${flagged}`,
        maxOutputTokens: 2500,
        abortSignal: request.signal,
      });
      return Response.json(output);
    }

    const { output } = await generateText({
      model: amazonBedrock(MODELS.one),
      output: Output.object({ schema: card }),
      instructions: `${CLASSIFY}\n\n${notes}`,
      prompt: `Recent transcript:\n${input.context.join("\n") || "(none)"}\n\nNewest speech:\n${input.latest}`,
      maxOutputTokens: 800,
      abortSignal: request.signal,
    });

    // Fall back to the safest route if the model's answer is incomplete.
    let route = output.isQuestion ? (output.route ?? "patient") : null;
    if (route === "answer" && !output.answer?.trim()) route = "patient";
    const options = output.options.filter((o) => o.label.trim() && o.say.trim()).slice(0, 4);
    if (route === "ask" && options.length < 2) route = "patient";

    return Response.json({
      route,
      question: output.question.trim(),
      simple: output.simple.trim() || output.question.trim(),
      answer: route === "answer" ? output.answer?.trim() : null,
      options: route === "ask" ? options : [],
    });
  } catch (error) {
    console.error("[barry] Room error:", error);
    return Response.json({ error: "Barry couldn't follow that part." }, { status: 502 });
  }
}
