import { auth } from "@clerk/nextjs/server";
import { amazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText, Output } from "ai";
import { z } from "zod";
import { bedrockConfigured, MODELS } from "@/lib/barry";

// Turns what a patient said or typed during onboarding into profile entries,
// e.g. "metformin 500 milligrams twice a day and lisinopril" → two medications.
const SCHEMAS = {
  medications: z.object({
    items: z.array(
      z.object({
        name: z.string().describe("Medicine name, capitalized."),
        dose: z.string().describe('Amount, like "500 mg". Empty if not said.'),
        schedule: z.string().describe('When or how often, like "Twice a day". Empty if not said.'),
        reason: z.string().describe("What it's for. Empty if not said."),
      }),
    ),
  }),
  allergies: z.object({
    items: z.array(
      z.object({
        substance: z.string().describe("What they're allergic to, capitalized."),
        reaction: z.string().describe("What happens. Empty if not said."),
        severity: z.enum(["", "mild", "moderate", "severe"]).describe("Only if they said how serious it is."),
      }),
    ),
  }),
  conditions: z.object({
    items: z.array(
      z.object({
        name: z.string().describe("Condition name, capitalized."),
        notes: z.string().describe("Anything else they said about it. Empty if nothing."),
      }),
    ),
  }),
  support: z.object({
    items: z.array(
      z.object({
        name: z.string().describe("The person's name, or how they're referred to if no name is given."),
        relationship: z.string().describe('Who they are, like "Mom" or "Carer". Empty if not said.'),
        phone: z.string().describe("Phone number if said. Empty otherwise."),
        decides: z.boolean().describe("True if they help make decisions."),
      }),
    ),
  }),
};

const CAPITALIZE = new Set(["name", "substance", "relationship", "schedule", "reason", "reaction", "notes"]);

// Small tidy-ups so entries read consistently: "baclofen" → "Baclofen", "10mg" → "10 mg".
function tidy(item: object) {
  return Object.fromEntries(
    Object.entries(item).map(([key, value]) => {
      if (typeof value !== "string") return [key, value];
      let text = value.trim();
      if (key === "dose") text = text.replace(/(\d)\s*(mg|mcg|ml|g|iu|units?)\b/gi, (_, n, unit) => `${n} ${unit.toLowerCase() === "iu" ? "IU" : unit.toLowerCase()}`);
      if (CAPITALIZE.has(key) && text) text = text.charAt(0).toUpperCase() + text.slice(1);
      return [key, text];
    }),
  );
}

const body = z.object({
  section: z.enum(["medications", "allergies", "conditions", "support"]),
  text: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Please sign in to use Barry." }, { status: 401 });
  if (!bedrockConfigured()) {
    return Response.json({ error: "Barry isn't connected to Amazon Bedrock yet." }, { status: 503 });
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "That request wasn't valid." }, { status: 400 });
  const { section, text } = parsed.data;
  const schema: z.ZodType<{ items: object[] }> = SCHEMAS[section];

  try {
    const { output } = await generateText({
      model: amazonBedrock(MODELS.one),
      output: Output.object({ schema }),
      instructions: `A patient is telling Barry, their health companion, about their ${section}. The text may come from speech-to-text, so fix obvious mishearings of medical words. Split it into separate entries. Keep their meaning and never invent details: leave a field empty if it wasn't said. If they say they have none, return no items. Write numbers as digits and units short (mg, ml).`,
      prompt: text,
      maxOutputTokens: 800,
      abortSignal: request.signal,
    });
    return Response.json({ items: output.items.slice(0, 20).map(tidy) });
  } catch (error) {
    console.error("[barry] Profile extract error:", error);
    return Response.json({ error: "Barry couldn't understand that. Try saying it another way." }, { status: 502 });
  }
}
