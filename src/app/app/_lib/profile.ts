import type { Profile } from "./vault";

export const COMMUNICATION = [
  { id: "slow", label: "Speak slowly", ask: "speak slowly" },
  { id: "one", label: "Ask one question at a time", ask: "ask one question at a time" },
  { id: "time", label: "Give me extra time to answer", ask: "allow extra time for answers" },
  { id: "simple", label: "Use plain, simple words", ask: "use plain, simple words" },
  { id: "yesno", label: "Ask yes-or-no questions when you can", ask: "ask yes-or-no questions when you can" },
  { id: "write", label: "Write important things down", ask: "write down anything important" },
  { id: "direct", label: "Talk to me, not only the person with me", ask: "speak directly to the patient" },
  { id: "aac", label: "I may type, point, or use a device to answer", ask: "expect some answers to be typed or pointed to" },
];

export const FIELDS = [
  { key: "name", label: "What Barry calls you" },
  { key: "conditions", label: "Health conditions" },
  { key: "medications", label: "Medicines" },
  { key: "allergies", label: "Allergies" },
  { key: "communication", label: "How to talk with you" },
  { key: "supporter", label: "Helps you decide" },
] as const;

export type FieldKey = (typeof FIELDS)[number]["key"];

export function display(profile: Profile, key: FieldKey) {
  if (key !== "communication") return profile[key].trim();
  const picked = COMMUNICATION.filter((option) => profile.communication.includes(option.id)).map((o) => o.label);
  return [...picked, profile.communicationNotes.trim()].filter(Boolean).join("\n");
}

export function isEmpty(profile: Profile) {
  return FIELDS.every(({ key }) => !display(profile, key));
}

const list = new Intl.ListFormat("en", { type: "conjunction" });

// What Barry says to the doctor at the start of a visit, so the patient doesn't
// have to explain their needs again.
export function introduction(profile: Profile) {
  const name = profile.name.trim();
  const who = name || "the patient";
  const asks = COMMUNICATION.filter((option) => profile.communication.includes(option.id)).map((o) =>
    o.ask.replace("the patient", who),
  );
  const notes = profile.communicationNotes.trim().replace(/[.\s]+$/, "");

  return [
    name ? `Hi, I'm Barry. I'm here to help ${name} during this visit.` : "Hi, I'm Barry. I'm here to help during this visit.",
    asks.length ? `To communicate best, please ${list.format(asks)}.` : "",
    notes ? `${name || "They"} would also like you to know: ${notes}.` : "",
    `I can answer some questions from what I've been told. Decisions are always up to ${who}. Thank you.`,
  ]
    .filter(Boolean)
    .join(" ");
}
