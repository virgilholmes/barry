import "server-only";
import { z } from "zod";
import { COMMUNICATION_PREFERENCES } from "./profile";

// Bedrock model IDs behind Barry. Override per environment if your account
// uses different inference profiles (e.g. an `eu.` or `global.` prefix).
export const MODELS = {
  one: process.env.BEDROCK_MODEL_ONE ?? "us.anthropic.claude-haiku-5-5",
  pro: process.env.BEDROCK_MODEL_PRO ?? "us.anthropic.claude-sonnet-5-5",
};

export function bedrockConfigured() {
  return Boolean(process.env.AWS_BEARER_TOKEN_BEDROCK || process.env.AWS_ACCESS_KEY_ID);
}

const text = (max = 300) => z.string().max(max);
const id = z.string().max(100);
const list = <T extends z.ZodType>(item: T) => z.array(item).max(50);

export const profileSchema = z.object({
  name: z.string().max(100).default(""),
  medications: list(z.object({ id, name: text(), dose: text(), schedule: text(), reason: text() })),
  allergies: list(
    z.object({ id, substance: text(), reaction: text(), severity: z.enum(["", "mild", "moderate", "severe"]) }),
  ),
  conditions: list(z.object({ id, name: text(), notes: text(1000) })),
  communication: z.object({
    preferences: z.array(z.enum(COMMUNICATION_PREFERENCES.map((p) => p.id) as [string, ...string[]])).max(20),
    notes: text(2000),
  }),
  support: list(z.object({ id, name: text(), relationship: text(), phone: text(50), decides: z.boolean() })),
  share: z.object({
    medications: z.boolean(),
    allergies: z.boolean(),
    conditions: z.boolean(),
    communication: z.boolean(),
    support: z.boolean(),
    notes: text(2000),
  }),
});
