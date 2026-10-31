import { countDetails, emptyProfile, type Profile } from "@/lib/profile";
import { createLocalStore } from "./local-store";

const EMPTY = emptyProfile();

function parse(raw: unknown): Profile {
  if (!raw || typeof raw !== "object") return EMPTY;
  const saved = raw as Partial<Profile>;
  return {
    ...EMPTY,
    ...saved,
    communication: { ...EMPTY.communication, ...saved.communication },
    share: { ...EMPTY.share, ...saved.share },
  };
}

// Carries over details saved by the earlier, free-text version of "What Barry Knows".
function migrate(): Profile | undefined {
  try {
    const legacy = JSON.parse(localStorage.getItem("barry:knowledge") ?? "null") as Record<
      string,
      { id: string; text: string }[]
    > | null;
    if (!legacy) return undefined;
    const items = (key: string) => legacy[key] ?? [];
    return {
      ...EMPTY,
      medications: items("medications").map(({ id, text }) => ({ id, name: text, dose: "", schedule: "", reason: "" })),
      allergies: items("allergies").map(({ id, text }) => ({ id, substance: text, reaction: "", severity: "" })),
      conditions: items("conditions").map(({ id, text }) => ({ id, name: text, notes: "" })),
      communication: { preferences: [], notes: items("communication").map((f) => f.text).join("\n") },
      support: items("support").map(({ id, text }) => ({ id, name: text, relationship: "", phone: "", decides: false })),
    };
  } catch {
    return undefined;
  }
}

const store = createLocalStore<Profile>({ key: "barry:profile", fallback: EMPTY, parse, initial: migrate });

export const useProfile = store.use;
export const getProfile = store.get;
export const updateProfile = store.set;

// `null` until we know (e.g. while prerendering), so onboarding never flashes.
const onboarded = createLocalStore<boolean | null>({
  key: "barry:onboarded",
  fallback: null,
  parse: (raw) => raw === true,
  // People who already filled in their profile don't need onboarding.
  initial: () => countDetails(store.get()) > 0,
});

export const useOnboarded = onboarded.use;
export const setOnboarded = onboarded.set;
