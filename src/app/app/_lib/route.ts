import type { Profile } from "./vault";

// Barry sorts every question from the doctor into one of three routes:
//   answer: Barry already knows ("Any allergies?") and offers the answer.
//   ask:    only the patient knows ("How's your pain?"), so Barry helps them reply.
//   decide: the patient's choice ("Would you like to try...?"). Barry never answers.
// ponytail: keyword rules, English only, run on-device. Swap for an on-device model if they miss too often.
export type Route = "answer" | "ask" | "decide";
export type ReplyKind = "yesno" | "scale" | "open";
export type Classified =
  | { route: "answer"; answer: string }
  | { route: "ask"; kind: ReplyKind }
  | { route: "decide" };

const FILLER = /^((so|and|okay|ok|um+|uh+|alright|all right|now|well|great|good)[,.]?\s+)+/i;
const ASKING =
  /^(who|what|what's|when|where|why|how|which|do|does|did|are|is|was|were|have|has|had|can|could|will|would|should|shall|may|any|tell me)\b/i;

const DECIDE =
  /\b(would you like|do you want|are you (ok|okay|alright|comfortable) with|is (that|it|this) (ok|okay|alright)|should we|shall we|consent|agree to|prefer|choose|decide|options?|go ahead with|start you on|put you on|sign (this|here|the))\b/i;

const FACTS: { pattern: RegExp; answer: (p: Profile) => string | null }[] = [
  { pattern: /\ballerg/i, answer: (p) => fact("Allergies", p.allergies) },
  {
    pattern: /\b(medications?|medicines?|meds|pills|prescriptions?|(are you|you're|what are you) taking)\b/i,
    answer: (p) => fact("Medicines", p.medications),
  },
  {
    pattern: /\b(conditions?|diagnos(is|es|ed)|medical history|health history|health problems|disabilit(y|ies))\b/i,
    answer: (p) => fact("Health conditions", p.conditions),
  },
  {
    pattern: /\b(who (helps|makes decisions|decides)|caregiver|carer|guardian|support person|power of attorney)\b/i,
    answer: (p) => fact("Helps me make decisions", p.supporter),
  },
  { pattern: /\bwhat('s| is) your name\b|\bwhat should i call you\b/i, answer: (p) => fact("My name", p.name) },
];

function fact(label: string, value: string) {
  const text = value.trim().replace(/[.\s]+$/, "");
  return text ? `${label}: ${text}.` : null;
}

export function clean(text: string) {
  return text.trim().replace(/\s+/g, " ").replace(FILLER, "");
}

// Speech-to-text rarely adds punctuation, so a line counts as a question when it
// ends in "?" or opens like one.
export function isQuestion(text: string) {
  const line = clean(text);
  return line.endsWith("?") || ASKING.test(line) || DECIDE.test(line);
}

export function classify(question: string, profile: Profile): Classified {
  const line = clean(question);
  if (DECIDE.test(line)) return { route: "decide" };

  const match = FACTS.find(({ pattern }) => pattern.test(line));
  const answer = match?.answer(profile);
  if (answer) return { route: "answer", answer };

  if (/\b(scale|out of (10|ten)|(0|zero|1|one) to (10|ten)|rate (your|it|that|this|the|how))\b/i.test(line)) {
    return { route: "ask", kind: "scale" };
  }
  if (/^(do|does|did|are|is|was|were|have|has|had|can|could|will|would|any)\b/i.test(line)) return { route: "ask", kind: "yesno" };
  return { route: "ask", kind: "open" };
}
