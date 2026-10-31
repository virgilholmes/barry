// The patient profile ("What Barry Knows"). Shared by the app and the API so
// both describe the patient the same way.

export type Medication = { id: string; name: string; dose: string; schedule: string; reason: string };
export type Allergy = { id: string; substance: string; reaction: string; severity: "" | "mild" | "moderate" | "severe" };
export type Condition = { id: string; name: string; notes: string };
export type Supporter = { id: string; name: string; relationship: string; phone: string; decides: boolean };

export type ShareSection = "medications" | "allergies" | "conditions" | "communication" | "support";

export type Profile = {
  name: string;
  medications: Medication[];
  allergies: Allergy[];
  conditions: Condition[];
  communication: { preferences: string[]; notes: string };
  support: Supporter[];
  share: Record<ShareSection, boolean> & { notes: string };
};

export const COMMUNICATION_PREFERENCES = [
  { id: "yes-no", label: "Ask me short, yes-or-no questions" },
  { id: "one-at-a-time", label: "Ask one question at a time" },
  { id: "plain-words", label: "Use plain words, not medical terms" },
  { id: "extra-time", label: "Give me extra time to answer" },
  { id: "talk-to-me", label: "Talk to me directly, not only my helper" },
  { id: "write-down", label: "Write important things down for me" },
  { id: "device", label: "I may type or use a device to communicate" },
  { id: "face-me", label: "Face me when you speak" },
] as const;

export const SECTION_TITLES: Record<ShareSection, string> = {
  medications: "Medications",
  allergies: "Allergies",
  conditions: "Conditions",
  communication: "How I communicate",
  support: "People who help me",
};

export function emptyProfile(): Profile {
  return {
    name: "",
    medications: [],
    allergies: [],
    conditions: [],
    communication: { preferences: [], notes: "" },
    support: [],
    share: { medications: true, allergies: true, conditions: true, communication: true, support: true, notes: "" },
  };
}

export function preferenceLabels(profile: Profile) {
  return COMMUNICATION_PREFERENCES.filter((p) => profile.communication.preferences.includes(p.id)).map((p) => p.label);
}

export function countDetails(profile: Profile) {
  return (
    (profile.name.trim() ? 1 : 0) +
    profile.medications.length +
    profile.allergies.length +
    profile.conditions.length +
    profile.support.length +
    profile.communication.preferences.length +
    (profile.communication.notes.trim() ? 1 : 0) +
    (profile.share.notes.trim() ? 1 : 0)
  );
}

function parts(...values: string[]) {
  return values.map((v) => v.trim()).filter(Boolean);
}

const describe = {
  medications: (p: Profile) =>
    p.medications.map((m) => {
      const detail = parts(m.dose, m.schedule).join(", ");
      return `${m.name}${detail ? ` (${detail})` : ""}${m.reason.trim() ? `, for ${m.reason.trim()}` : ""}`;
    }),
  allergies: (p: Profile) =>
    p.allergies.map((a) => {
      const detail = parts(a.reaction && `reaction: ${a.reaction}`, a.severity).join(", ");
      return `${a.substance}${detail ? ` (${detail})` : ""}`;
    }),
  conditions: (p: Profile) => p.conditions.map((c) => `${c.name}${c.notes.trim() ? ` (${c.notes.trim()})` : ""}`),
  communication: (p: Profile) => [...preferenceLabels(p), ...parts(p.communication.notes)],
  support: (p: Profile) =>
    p.support.map((s) => {
      const detail = parts(s.relationship, s.phone, s.decides ? "can help make decisions" : "").join(", ");
      return `${s.name}${detail ? ` (${detail})` : ""}`;
    }),
};

/** What Barry may say aloud in an appointment, section by section. */
export function sharedDetails(profile: Profile) {
  const sections = (Object.keys(describe) as ShareSection[])
    .filter((section) => profile.share[section])
    .map((section) => ({ title: SECTION_TITLES[section], items: describe[section](profile) }))
    .filter((section) => section.items.length > 0);
  if (profile.share.notes.trim()) {
    sections.push({ title: "Things I want my care team to know", items: [profile.share.notes.trim()] });
  }
  return sections;
}

/**
 * Describes the patient for Barry's instructions. In appointments (`room`),
 * only what the patient chose to share is included as something Barry may say.
 */
export function describeProfile(profile: Profile, { room = false } = {}) {
  if (room) {
    const shared = sharedDetails(profile).map((s) => `${s.title}: ${s.items.join("; ")}`);
    const communication = describe.communication(profile);
    // Barry still adapts to how they communicate, even if it isn't to be said aloud.
    const privateNotes =
      !profile.share.communication && communication.length > 0
        ? `For your own use only. Never say this aloud:\nHow they communicate: ${communication.join("; ")}`
        : "";
    const sections = [
      profile.name.trim() ? `Their name is ${profile.name.trim()}.` : "",
      shared.length > 0 ? `What they've agreed Barry can share in this appointment:\n${shared.join("\n")}` : "",
      privateNotes,
    ].filter(Boolean);
    return sections.length > 0 ? sections.join("\n\n") : "They haven't shared any health details yet.";
  }

  const name = profile.name.trim() ? `Their name is ${profile.name.trim()}.\n\n` : "";
  return name + describeAll(profile);
}

function describeAll(profile: Profile) {
  const lines = (Object.keys(describe) as ShareSection[])
    .map((section) => ({ title: SECTION_TITLES[section], items: describe[section](profile) }))
    .filter((section) => section.items.length > 0)
    .map((section) => `${section.title}: ${section.items.join("; ")}`);
  if (profile.share.notes.trim()) lines.push(`Things they want their care team to know: ${profile.share.notes.trim()}`);
  return lines.length > 0
    ? `Private notes on what they've told you:\n${lines.join("\n")}`
    : "They haven't shared any health details yet.";
}
